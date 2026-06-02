// Ideologue power activation. The engine accepts free-form params per power;
// this UI is intentionally minimal — we let the engine reject invalid params
// and surface its error. A richer per-power UI can be added later.
import { useState } from "react";
import Modal from "./Modal";
import type { GameState, Ideologue } from "@/engine/types";
import { useDispatch } from "@/ui/hooks/useDispatch";

interface Props {
  state: GameState;
  ideologue: Ideologue;
  level: 3 | 5;
  onClose: () => void;
}

export default function PowerModal({ ideologue, level, onClose }: Props) {
  const dispatch = useDispatch();
  const [json, setJson] = useState<string>("{}");
  const [parseError, setParseError] = useState<string | null>(null);

  const submit = () => {
    let params: Record<string, unknown> | undefined;
    try {
      params = JSON.parse(json);
    } catch (e: any) {
      setParseError(e?.message ?? "Invalid JSON");
      return;
    }
    dispatch({ t: "useIdeologuePower", ideologue, level, params });
    onClose();
  };

  return (
    <Modal title={`Use power — ${ideologue} L${level}`} onClose={onClose}>
      <div className="space-y-3">
        <div className="text-xs text-neutral-400">
          Pass any params required by this power. Refer to the rulebook for the
          power's effect. (Engine will validate.)
        </div>
        <textarea
          className="w-full h-32 bg-neutral-900 border border-neutral-700 rounded p-2 text-xs font-mono"
          value={json}
          onChange={(e) => {
            setJson(e.target.value);
            setParseError(null);
          }}
        />
        {parseError ? (
          <div className="text-xs text-red-400">{parseError}</div>
        ) : null}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded border border-neutral-600 hover:bg-neutral-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            className="px-3 py-1 rounded bg-blue-700 hover:bg-blue-600"
          >
            Activate
          </button>
        </div>
      </div>
    </Modal>
  );
}
