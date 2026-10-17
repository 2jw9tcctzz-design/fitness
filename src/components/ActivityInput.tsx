import type { ActivityType } from "../types/program";
import type { StrengthStatus } from "../types/dailyLog";
import { NumberInputRow } from "./NumberInputRow";
import { StrengthInput } from "./StrengthInput";

type Props = {
  activityType: ActivityType;
  strengthStatus: StrengthStatus | null;
  strengthMovedTo: string | null;
  moveCandidates: string[];
  movedInFrom: string | null;
  onStrengthStatusChange: (status: StrengthStatus | null) => void;
  onStrengthMovedToChange: (date: string) => void;
  mobilityMinutes: string;
  onMobilityChange: (text: string) => void;
};

/** Dagens aktivitet: styrkepass på styrkedagar (planerade eller flyttade hit), mobility övriga dagar. */
export function ActivityInput(props: Props) {
  if (props.activityType === "strength") {
    return (
      <StrengthInput
        status={props.strengthStatus}
        movedTo={props.strengthMovedTo}
        candidates={props.moveCandidates}
        movedInFrom={props.movedInFrom}
        onStatusChange={props.onStrengthStatusChange}
        onMovedToChange={props.onStrengthMovedToChange}
      />
    );
  }
  return (
    <NumberInputRow label="Mobility" unit="min" value={props.mobilityMinutes} onChange={props.onMobilityChange} />
  );
}
