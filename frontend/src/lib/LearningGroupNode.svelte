<script lang="ts">
  type LearningGroupNodeData = {
    title: string;
    kind: "phase" | "room" | "station";
    kindLabel: string;
    memberCount: number;
  };

  export let data: LearningGroupNodeData;
</script>

<section class={`learning-group-node group-${data.kind}`} aria-label={`${data.kindLabel}: ${data.title}`}>
  <header>
    <span>{data.kindLabel}</span>
    <strong>{data.title}</strong>
  </header>
  <p>{data.memberCount} Lernmoment{data.memberCount === 1 ? "" : "e"} in dieser Fläche</p>
</section>

<style>
  .learning-group-node {
    width: 100%;
    height: 100%;
    padding: .72rem .85rem;
    border: 1px dashed #a5bdb5;
    border-radius: .9rem;
    background: rgba(232, 243, 238, .68);
    color: #41615c;
    pointer-events: none;
  }
  .learning-group-node.group-phase { background: rgba(236, 242, 232, .7); border-color: #9cac83; }
  .learning-group-node.group-room { background: rgba(230, 239, 246, .7); border-color: #8faec2; }
  .learning-group-node.group-station { background: rgba(245, 237, 224, .72); border-color: #c0a27c; }
  .learning-group-node header { display: grid; gap: .12rem; }
  .learning-group-node header span { font-size: .64rem; font-weight: 800; letter-spacing: .05em; text-transform: uppercase; }
  .learning-group-node header strong { font-size: .92rem; }
  .learning-group-node p { margin: .28rem 0 0; color: #607772; font-size: .68rem; }
</style>
