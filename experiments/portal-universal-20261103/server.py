"""Loopback-only HTTP/SSE-free local cockpit for the real persistent graph engine.
No injected truth paths, fake frame loops or detached decorative graphs.
"""
from __future__ import annotations
import argparse
import json
import mimetypes
import os
import threading
import time
from http.server import ThreadingHTTPServer,BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import parse_qs,urlsplit
from engine import PortalEngine,KINDS
from corpus import Corpus,ingest

HERE=Path(__file__).resolve().parent

class Control:
    def __init__(self,engine):
        self.engine=engine
        self.lock=threading.RLock()
        self.stop=threading.Event()
        self.worker=None
        self.state='idle'
        self.error=None
        self.config={'domains':['maze3d','network','symbols','yesno','car'],
                     'batch_size':8,'autosave_every':20,'capture':True,'epsilon':.18}
        self.saved_at=None
        self.last_batch=None
        self.completed_batches=0
        self.corpus_meta=None
        self.ingest_worker=None
        self.corpus_ingest={'state':'idle','progress':0.0}
        # The source corpus is part of the training state; restore it on restart.
        meta_file=self.engine.folder/'corpus.json'
        if meta_file.is_file():
            try:
                meta=json.loads(meta_file.read_text(encoding='utf-8'))
                self.engine.corpus=Corpus(meta['path'])
                if self.engine.corpus.digest!=meta['sha256']:
                    raise ValueError('Corpus cache checksum changed')
                self.corpus_meta=meta
                self.corpus_ingest={'state':'ready','progress':1.0, **meta}
            except (OSError,ValueError,KeyError):
                if self.engine.corpus is not None:
                    self.engine.corpus.close();self.engine.corpus=None
                self.corpus_meta={'error':'Saved corpus missing or corrupted; reload original file'}
                self.corpus_ingest={'state':'error','progress':0.0,
                                    'error':self.corpus_meta['error']}

    def _progress_ingest(self,progress):
        with self.lock:
            self.corpus_ingest=dict(progress)

    def begin_corpus(self,path):
        """Acknowledges immediately; UI can poll actual Parquet row-group progress."""
        with self.lock:
            if self.state in ('running','stopping'):
                raise RuntimeError('Stop training before loading another corpus')
            if self.ingest_worker and self.ingest_worker.is_alive():
                raise RuntimeError('Corpus import already active')
            source=Path(path).expanduser()
            if not source.is_file():raise FileNotFoundError(str(source))
            if source.suffix.lower() not in ('.parquet','.jsonl','.txt','.md'):
                raise ValueError('Supported corpora: TXT / MD / JSONL / Parquet')
            self.corpus_ingest={'state':'queued','progress':0.0,
                                'source':str(source.resolve()),'source_bytes':source.stat().st_size}
            self.ingest_worker=threading.Thread(target=self._corpus_worker,
                                               args=(str(source),),daemon=True)
            self.ingest_worker.start()
            return self.corpus_ingest.copy()

    def _corpus_worker(self,path):
        try:
            meta=ingest(path,self.engine.folder/'corpora',on_progress=self._progress_ingest)
            new=Corpus(meta['path'])
            with self.lock:
                old=self.engine.corpus
                self.engine.corpus=new
                self.corpus_meta=meta
                target=self.engine.folder/'corpus.json'
                temporary=target.with_suffix('.json.tmp')
                temporary.write_text(json.dumps(meta,ensure_ascii=False),encoding='utf-8')
                temporary.replace(target)
                self.corpus_ingest={'state':'ready','progress':1.0,**meta}
                if old is not None and hasattr(old,'close'):old.close()
        except Exception as exc:
            with self.lock:
                self.corpus_ingest={**self.corpus_ingest,'state':'error',
                                    'error':str(exc)}

    def start(self,config):
        with self.lock:
            if self.worker and self.worker.is_alive():raise RuntimeError('Training already active')
            if self.ingest_worker and self.ingest_worker.is_alive():
                raise RuntimeError('Corpus is still importing: wait for ready status')
            domains=config.get('domains',self.config['domains'])
            if (not isinstance(domains,list) or not domains or
                    any(d not in KINDS for d in domains)):raise ValueError('Choose valid training domains')
            if 'text' in domains and self.engine.corpus is None:raise ValueError('Load a real text corpus before training text')
            size=int(config.get('batch_size',8));every=int(config.get('autosave_every',20))
            if size<1 or size>64:raise ValueError('batch_size must be 1..64')
            if every<1 or every>1000:raise ValueError('autosave_every must be 1..1000')
            eps=float(config.get('epsilon',.18));
            if not 0<=eps<=1:raise ValueError('epsilon must be between 0 and 1')
            self.config={'domains':domains,'batch_size':size,'autosave_every':every,
                         'capture':bool(config.get('capture',True)),'epsilon':eps}
            self.error=None;self.state='running';self.stop.clear()
            self.worker=threading.Thread(target=self._work,daemon=True)
            self.worker.start()

    def _work(self):
        try:
            while not self.stop.is_set():
                with self.lock:
                    self.last_batch=self.engine.episode_many(self.config['domains'],
                        self.config['batch_size'],self.config['epsilon'],self.config['capture'])
                    self.completed_batches+=1
                    if self.completed_batches%self.config['autosave_every']==0:
                        self.engine.save();self.saved_at=time.time()
                # Yield the GIL / HTTP response server between real batches.
                time.sleep(.002)
        except Exception as exc:
            with self.lock:self.error=str(exc);self.state='error'
        finally:
            with self.lock:
                try:self.engine.save();self.saved_at=time.time()
                except Exception as exc:self.error=(self.error or '')+' checkpoint error: '+str(exc)
                if self.state!='error':self.state='stopped'

    def stop_and_save(self):
        self.stop.set()
        with self.lock:
            if self.state=='running':self.state='stopping'

    def status(self):
        with self.lock:
            d=self.engine.status()
            d.update({'state':self.state,'error':self.error,'config':self.config,
                      'last_batch':self.last_batch,'saved_at':self.saved_at,
                      'batches':self.completed_batches,'corpus':self.corpus_meta,
                      'corpus_ingest':self.corpus_ingest})
            return d

    def set_corpus(self,path):
        with self.lock:
            if self.state in ('running','stopping'):raise RuntimeError('Stop training before loading another corpus')
            meta=ingest(path,self.engine.folder/'corpora')
            if self.engine.corpus is not None and hasattr(self.engine.corpus,'close'):self.engine.corpus.close()
            self.engine.corpus=Corpus(meta['path']);self.corpus_meta=meta
            self.corpus_ingest={'state':'ready','progress':1.0,**meta}
            target=self.engine.folder/'corpus.json';temp=target.with_suffix('.json.tmp')
            temp.write_text(json.dumps(meta,ensure_ascii=False),encoding='utf-8')
            temp.replace(target)
            return meta

class Handler(BaseHTTPRequestHandler):
    control=None
    def _json(self,code,data):
        body=json.dumps(data,ensure_ascii=False,allow_nan=False).encode('utf-8')
        self.send_response(code);self.send_header('Content-Type','application/json; charset=utf-8')
        self.send_header('Cache-Control','no-store');self.send_header('Content-Length',str(len(body)))
        self.send_header('Access-Control-Allow-Origin','http://127.0.0.1:3050')
        self.end_headers();self.wfile.write(body)

    def _auth(self):
        # UI is intentionally localhost-only; a hostile website must not modify it via cross-origin POST.
        o=self.headers.get('Origin','')
        return not o or o in ('http://127.0.0.1:'+str(self.server.server_port),
                              'http://localhost:'+str(self.server.server_port))

    def do_GET(self):
        parsed=urlsplit(self.path);path=parsed.path
        if path=='/':path='/index.html'
        if path in ('/index.html','/style.css','/app.js'):
            p=(HERE/'web'/path.lstrip('/')).resolve()
            if p.parent!=(HERE/'web').resolve() or not p.is_file():self.send_error(404);return
            data=p.read_bytes();typ=mimetypes.guess_type(p.name)[0] or 'text/plain'
            self.send_response(200);self.send_header('Content-Type',typ+'; charset=utf-8')
            self.send_header('Cache-Control','no-store')
            self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data);return
        c=self.control
        if path=='/api/health':self._json(200,{'ok':True,'training':c.state,'device':str(c.engine.device)});return
        if path=='/api/status':self._json(200,c.status());return
        if path=='/api/graph':
            with c.lock:
                last=c.engine.last_trace
                active=last.get('active',[]) if last else []
                self._json(200,c.engine.graph.view(active=active,limit=500))
            return
        if path=='/api/traces':
            query=parse_qs(parsed.query)
            with c.lock:self._json(200,c.engine.recent(int(query.get('limit',['50'])[0])))
            return
        self._json(404,{'error':'Unknown route'})

    def do_POST(self):
        if not self._auth():self._json(403,{'error':'Invalid Origin'});return
        try:
            n=int(self.headers.get('Content-Length','0'))
            if n<0 or n>1048576:raise ValueError('Body too large')
            data=json.loads(self.rfile.read(n)) if n else {}
            path=urlsplit(self.path).path;c=self.control
            if path=='/api/start':c.start(data);self._json(200,{'state':'running','config':c.config});return
            if path=='/api/stop':c.stop_and_save();self._json(200,{'state':c.state});return
            if path=='/api/save':
                with c.lock:
                    if c.state=='running':raise RuntimeError('Stop first; saving at autosave checkpoints')
                    saved=c.engine.save();c.saved_at=time.time()
                self._json(200,{'saved':saved});return
            if path=='/api/evaluate':
                with c.lock:
                    if c.state=='running':raise RuntimeError('Stop training before blind evaluation')
                    result=c.engine.evaluate(data.get('domains'),int(data.get('count',24)))
                self._json(200,result);return
            if path=='/api/corpus':
                source=data.get('path')
                if not isinstance(source,str):raise ValueError('path must be a local TXT, MD, JSONL or Parquet file')
                meta=c.begin_corpus(source);self._json(202,meta);return
            self._json(404,{'error':'Unknown route'})
        except (RuntimeError,ValueError,OSError,TypeError) as e:
            self._json(400,{'error':str(e)})
        except Exception as exc:
            self._json(500,{'error':type(exc).__name__+': '+str(exc)})

    def log_message(self,*args):pass


def main(argv=None):
    parser=argparse.ArgumentParser()
    parser.add_argument('--host',default='127.0.0.1')
    parser.add_argument('--port',type=int,default=3050)
    parser.add_argument('--data',default=str(HERE/'data'))
    parser.add_argument('--device',choices=('cuda','cpu'),default='cuda')
    parser.add_argument('--corpus')
    args=parser.parse_args(argv)
    if args.host not in ('127.0.0.1','localhost'):
        parser.error('Only local loopback binding is enabled')
    engine=PortalEngine(args.data,args.device)
    control=Control(engine)
    if args.corpus:control.set_corpus(args.corpus)
    Handler.control=control
    srv=ThreadingHTTPServer((args.host,args.port),Handler)
    print('PORTAL V10 device='+str(engine.device)+' URL=http://'+args.host+':'+str(args.port),flush=True)
    try:srv.serve_forever(poll_interval=.2)
    except KeyboardInterrupt:pass
    finally:
        control.stop_and_save()
        if control.worker and control.worker.is_alive():control.worker.join()
        engine.close();srv.server_close()

if __name__=='__main__':main()
