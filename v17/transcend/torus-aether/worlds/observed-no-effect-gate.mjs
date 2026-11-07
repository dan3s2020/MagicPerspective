// MagicPerspective V25: evidence-based closed-world guard for the unchanged V23
// original Discoverer.shape learner. A perfect trajectory through an incomplete
// experienced world is not a correct prediction. Unknown relevant events force
// abstention, unless independent evidence established the sentence has no effect.
// This guard NEVER supplies a target answer or replaces Discoverer.shape.
import {logTokens} from "./grounded-temporal-hypermaze.mjs";

const tokenize=s=>logTokens(s).map(x=>x.toLocaleLowerCase("en-US"));
const lines=s=>String(s).match(/[^.!?\n]+[.!?]?/gu)||[];
const uniq=(t,value)=>{
  const indices=t.flatMap((x,i)=>x===value?[i]:[]);
  return indices.length===1?indices[0]:-1;
};
const key=(t,i)=>JSON.stringify([t.length,i,t.slice(0,3),t.slice(-4)]);
const deepSame=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

export class ObservedNoEffectEvidence {
  constructor({minimumIndependentExamples=4}={}){
    if(!Number.isInteger(minimumIndependentExamples)||minimumIndependentExamples<3)
      throw Error("Require multiple independent real no-effect observations");
    this.minEvidence=minimumIndependentExamples;
    this.groups=new Map();this.total=0;
  }
  observe({sentence,entity,before,after,accepted=true}={}){
    if(typeof sentence!=="string"||typeof entity!=="string"||!entity.trim()||
      !accepted||before===undefined||after===undefined||
      !deepSame(before,after))throw Error("Neutral observation needs independently unchanged physical state");
    const t=tokenize(sentence),lower=entity.toLocaleLowerCase("en-US"),at=uniq(t,lower);
    if(at<0||t.length<9)return {learned:false,reason:"AMBIGUOUS_NEUTRAL_SENTENCE"};
    const id=key(t,at),group=this.groups.get(id)||{id,entityAt:at,tokens:t.length,rows:[]};
    const fingerprint=JSON.stringify([t,lower,before,after]);
    if(!group.rows.some(x=>x.fingerprint===fingerprint))
      group.rows.push({tokens:t,entity:lower,fingerprint});
    this.groups.set(id,group);this.total++;
    return {learned:true,id,independentExamples:group.rows.length};
  }
  compiled(){
    const out=[];
    for(const group of this.groups.values()){
      if(group.rows.length<this.minEvidence||
        new Set(group.rows.map(r=>r.entity)).size<3)continue;
      const pat=[];
      for(let i=0;i<group.tokens;i++){
        if(i===group.entityAt){pat.push("@ENTITY");continue;}
        const first=group.rows[0].tokens[i];
        pat.push(group.rows.every(row=>row.tokens[i]===first)?first:"*");
      }
      const fixed=pat.filter(x=>x!=="*"&&x!=="@ENTITY").length;
      if(fixed<8||fixed<group.tokens*.55)continue;
      out.push({pattern:pat,entityAt:group.entityAt,evidence:group.rows.length,
        fixedTokens:fixed,source:"independently witnessed no-state-change events"});
    }
    return out;
  }
  neutral(sentence,entity){
    const t=tokenize(sentence),literal=entity.toLocaleLowerCase("en-US");
    return this.compiled().some(row=>row.pattern.length===t.length&&
      t[row.entityAt]===literal&&
      row.pattern.every((p,i)=>p==="*"||(p==="@ENTITY"?t[i]===literal:t[i]===p)));
  }
  audit(model,document,question){
    if(!model||typeof document!=="string"||typeof question!=="string")
      throw Error("Original witnessed model and complete document are required");
    const q=typeof model.inferQuestion==="function"?model.inferQuestion(question):null;
    const entity=q?(q.found?q.item:null):typeof model.parseQuestion==="function"?model.parseQuestion(question):null;
    if(!entity)return {safe:false,reason:"QUESTION_GRAMMAR_UNKNOWN",unknown:[],entity:null};
    const tkn=String(entity).toLocaleLowerCase("en-US");
    const unknown=[],all=lines(document);
    let recognizedEffects=0,recognizedInitials=0,recognizedNeutral=0;
    for(let i=0;i<all.length;i++){
      const sentence=all[i],tokens=tokenize(sentence);
      if(!tokens.includes(tkn))continue; // independent pronoun/coreference remains unresolved.
      const event=typeof model.inferEvent==="function"?model.inferEvent(sentence):null;
      const effect=typeof model.parseEffect==="function"?model.parseEffect(sentence):null;
      const initial=typeof model.parseInitial==="function"?model.parseInitial(sentence):null;
      if((event&&event.item===entity)||(effect&&effect.entity===entity)){recognizedEffects++;continue;}
      if(initial&&initial.entity===entity){recognizedInitials++;continue;}
      if(this.neutral(sentence,entity)){recognizedNeutral++;continue;}
      unknown.push({sentenceIndex:i,excerpt:sentence.trim().slice(0,180),
        meaning:"possible unlearned causal event; complete answer cannot be certified"});
    }
    return {safe:unknown.length===0,reason:unknown.length?"UNKNOWN_RELEVANT_SENTENCE":null,
      entity,unknown,recognizedEffects,recognizedInitials,recognizedNeutral,
      recognitionMethod:"exact entity-token reference + witnessed effect/no-effect grammar",
      unresolvedCoreferenceRisk:"PRONOUNS_AND_UNMENTIONED_ACTORS_NOT_SEMANTICALLY_RESOLVED"};
  }
  strictPlan(model,document,question,options={}){
    const audit=this.audit(model,document,question);
    if(!audit.safe)return {found:false,plannedBeforeAction:true,
      reason:audit.reason||"UNVERIFIED_LANGUAGE_WORLD",strictClosedWorld:true,
      audit,goalAnswerSupplied:false};
    const plan=model.plan(document,question,options);
    return {...plan,strictClosedWorld:true,audit,
      certifiedOnlyForObservedSyntax:!!plan.found,
      unrestrictedLanguageQAProved:false};
  }
  export(){return {version:1,minEvidence:this.minEvidence,total:this.total,
    groups:[...this.groups]};}
  static restore(saved){
    if(saved?.version!==1||!Array.isArray(saved.groups))
      throw Error("Incompatible neutral evidence checkpoint");
    const model=new ObservedNoEffectEvidence({minimumIndependentExamples:saved.minEvidence});
    model.groups=new Map(saved.groups);model.total=saved.total||0;
    return model;
  }
}
