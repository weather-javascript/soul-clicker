interface Props {
  show: boolean;
  stage: number;
}

export function StageClearBanner({ show, stage }: Props) {
  if (!show) return null;
  return (
    <div className="stage-clear-banner">
      <div className="stage-clear-text">STAGE CLEAR!</div>
      <div className="stage-clear-next">→ Stage {stage}</div>
    </div>
  );
}