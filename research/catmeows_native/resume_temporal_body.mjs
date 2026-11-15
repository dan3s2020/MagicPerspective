// Continue the ACTUALLY SAVED ORIGINAL BRAIVOUR Brain and its learned
// auditory body — no new model or retraining after resume.
//
// Usage: node research/catmeows_native/resume_temporal_body.mjs
//          runtime/catmeows/Original_Braivour_CatMeows_TemporalBody.v8 2091
// The saved native body object needs its methods reattached after original
// Brain.load() because the original Brain class registry predates this module.
// Its observations, action effects, original D, nine-dimensional auditory
// memories, original native transition graph, morphology and attractors are
// all loaded FROM THE .v8 checkpoint, not reconstructed from training data.
import fs from 'node:fs';
import {Brain} from '../../v17/transcend/torus-aether/devour/brain.mjs';
import {NativeTemporalAuditoryBody} from './native_temporal_body.mjs';
const checkpoint=process.argv[2]||'runtime/catmeows/Original_Braivour_CatMeows_TemporalBody.v8';
const seed=process.argv[3]===undefined?29173:Number(process.argv[3]);
if(!Number.isInteger(seed)||seed<1)throw Error('Provide positive integer autonomous native dream seed');
if(!fs.existsSync(checkpoint))throw Error('Original Braivour native Brain .v8 checkpoint missing');
const original=Brain.load(checkpoint);
if(!original.auditoryBody||!original.disc||!original.constructedPaths?.links)
 throw Error('Invalid original Brain: attached real-audio bodily memory is missing');
Object.setPrototypeOf(original.auditoryBody,NativeTemporalAuditoryBody.prototype);
original.auditoryBody.brain=original;
const body=original.auditoryBody;
if(!body.adjacency||!body.sum||!body.seen||
   body.adjacency.length!==144||body.sum.length!==144)
 throw Error('Native body audio world/experienced physical transitions missing after reload');
const before={
 originalSelf:original.disc.self(),
 originalEffects:[0,1,2,3,4,5,6,7].map(a=>original.disc.effect(a)),
 observedNativeTransitions:original.constructedPaths.links.observations,
 nativeEpisodes:original.disc.episodes,
 originalBrainLives:original.lived
};
if(before.originalSelf!==3||before.originalEffects.filter(Boolean).length!==4)
 throw Error('The loaded body has not actually learned the original four movement effects');
const generated=body.dream({seed,length:48});
if(!generated.stats.everyDreamTransitionInNativeActualAudioGraph)
 throw Error('Original Brain imagined an unexperienced acoustic-world transition');
if(original.constructedPaths.links.observations!==before.observedNativeTransitions||
   original.disc.episodes!==before.nativeEpisodes||original.lived!==before.originalBrainLives)
 throw Error('Imagination accidentally retrained or contaminated the original Brain');
const doc={
 status:'ACTUALLY_RESTORED_ORIGINAL_BRAIVOUR_BODY_GENERATED_NEW_AUDIO_TRAJECTORY',
 checkpoint,seed,sameOriginalBrain:true,originalAuditoryBodyRetained:true,
 originalNativeLearnedPhysicsRetained:true,
 originalNativeMotorSkillsRetained:true,
 before,generated
};
fs.mkdirSync('runtime/catmeows',{recursive:true});
fs.writeFileSync('runtime/catmeows/resumed_native_temporal_dream.json',JSON.stringify(doc,null,2));
console.log('CATMEOWS_SAVED_ORIGINAL_BRAIN_NEW_DREAM '+JSON.stringify({
 checkpoint,seed,bytes:fs.statSync(checkpoint).size,
 originalMotorSkills:before.originalEffects,
 transitions:before.observedNativeTransitions,
 output:generated.stats
}));
