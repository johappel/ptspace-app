<script lang="ts">
  import { Handle, Position } from "@xyflow/svelte";

  type LearningMomentNodeData = {
    title: string;
    kind: string;
    kindLabel: string;
    didacticPurpose: string;
    learningActivity: string;
    expectedExperience: string;
    statusLabel: string;
  };

  export let data: LearningMomentNodeData;
</script>

<Handle type="target" position={Position.Left} aria-label={`Verbindung zu ${data.title} beginnen`} />
<article class={`learning-moment-node kind-${data.kind}`} aria-label={`${data.kindLabel}: ${data.title}`}>
  <div class="learning-moment-node__topline">
    <span class="learning-moment-node__kind">{data.kindLabel}</span>
    <span class="learning-moment-node__status">{data.statusLabel}</span>
  </div>
  <h3>{data.title}</h3>
  <p>{data.didacticPurpose || data.learningActivity || "Didaktische Funktion noch offen"}</p>
  {#if data.learningActivity && data.learningActivity !== data.didacticPurpose}
    <small>{data.learningActivity}</small>
  {/if}
</article>
<Handle type="source" position={Position.Right} aria-label={`Verbindung von ${data.title} beginnen`} />

<style>
  .learning-moment-node {
    width: 218px;
    min-height: 118px;
    padding: .8rem .85rem;
    border: 2px solid #729a91;
    border-radius: .72rem;
    background: #f7fbf9;
    color: #163e3b;
    box-shadow: 0 4px 14px rgba(23, 65, 60, .12);
  }
  .learning-moment-node.kind-impulse { border-color: #8f6d46; }
  .learning-moment-node.kind-learning_place, .learning-moment-node.kind-practice { border-color: #4b8a79; }
  .learning-moment-node.kind-positioning, .learning-moment-node.kind-choice { border-color: #9a6b37; }
  .learning-moment-node.kind-inquiry, .learning-moment-node.kind-project { border-color: #4b7397; }
  .learning-moment-node.kind-product { border-color: #7866a1; }
  .learning-moment-node.kind-reflection, .learning-moment-node.kind-assessment { border-color: #577a61; }
  .learning-moment-node__topline { display: flex; justify-content: space-between; gap: .35rem; align-items: center; }
  .learning-moment-node__kind, .learning-moment-node__status { font-size: .66rem; font-weight: 800; letter-spacing: .03em; }
  .learning-moment-node__kind { color: #2d675d; text-transform: uppercase; }
  .learning-moment-node__status { color: #6c7e7b; }
  .learning-moment-node h3 { margin: .38rem 0 .28rem; font-size: .9rem; line-height: 1.25; }
  .learning-moment-node p { margin: 0; color: #385650; font-size: .75rem; line-height: 1.35; }
  .learning-moment-node small { display: block; margin-top: .42rem; color: #607671; font-size: .68rem; line-height: 1.3; }
</style>
