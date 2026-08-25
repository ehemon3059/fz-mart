"use client";

import { useMemo } from "react";
import type { DivisionOption, LocationTree } from "@/server/settings/locations";

/**
 * Cascading Division → District → Upazila selector.
 *
 * Shared by checkout and the account address book so both price a location the
 * same way and submit the same three hidden fields. The whole active tree
 * arrives as a prop, so changing a dropdown re-filters in memory — no network
 * round-trip per select, which matters on a slow phone mid-checkout.
 *
 * The component is CONTROLLED: it owns no state. The parent holds the
 * selection, which lets checkout drive it from a saved address and keep the
 * order summary in sync without duplicating the selection anywhere.
 */

export interface LocationSelection {
  divisionId: number | null;
  districtId: number | null;
  upazilaId: number | null;
}

/** What the current selection costs, and which zone said so. */
export interface LocationCharge {
  charge: number;
  zoneName: string;
  /** False until at least a district is chosen — nothing to price yet. */
  resolved: boolean;
}

interface Props {
  tree: LocationTree;
  value: LocationSelection;
  onChange: (next: LocationSelection) => void;
  /** Renders the three hidden inputs the server action reads. */
  name?: { division: string; district: string; upazila: string };
  disabled?: boolean;
  required?: boolean;
}

/**
 * Resolve the charge for a selection against the tree, most-specific-first —
 * the client mirror of the server's walk, used only to render the price the
 * customer sees. The server re-resolves independently at submit time.
 */
export function chargeForSelection(
  tree: LocationTree,
  value: LocationSelection,
): LocationCharge {
  const division = tree.divisions.find((d) => d.id === value.divisionId);
  if (!division) return { charge: 0, zoneName: "", resolved: false };

  const district = division.districts.find((d) => d.id === value.districtId);
  if (!district) return { charge: 0, zoneName: "", resolved: false };

  const upazila = district.upazilas.find((u) => u.id === value.upazilaId);
  const src = upazila ?? district;
  return { charge: src.charge, zoneName: src.zoneName, resolved: true };
}

export default function LocationPicker({
  tree,
  value,
  onChange,
  name = { division: "divisionId", district: "districtId", upazila: "upazilaId" },
  disabled = false,
  required = true,
}: Props) {
  const division: DivisionOption | undefined = useMemo(
    () => tree.divisions.find((d) => d.id === value.divisionId),
    [tree.divisions, value.divisionId],
  );
  const district = useMemo(
    () => division?.districts.find((d) => d.id === value.districtId),
    [division, value.districtId],
  );
  const upazilas = district?.upazilas ?? [];

  // Changing a level clears everything below it — keeping a stale upazila from
  // the previous district would submit a mismatched pair the server rejects.
  function pickDivision(id: number | null) {
    onChange({ divisionId: id, districtId: null, upazilaId: null });
  }
  function pickDistrict(id: number | null) {
    onChange({ divisionId: value.divisionId, districtId: id, upazilaId: null });
  }
  function pickUpazila(id: number | null) {
    onChange({ ...value, upazilaId: id });
  }

  const num = (raw: string) => (raw === "" ? null : Number(raw));

  return (
    <>
      {/* The server action reads these, not the selects — so the submitted
          value is always the resolved selection, never a half-typed state. */}
      <input type="hidden" name={name.division} value={value.divisionId ?? ""} />
      <input type="hidden" name={name.district} value={value.districtId ?? ""} />
      <input type="hidden" name={name.upazila} value={value.upazilaId ?? ""} />

      <div className="co-row2 co-field">
        <div>
          <label htmlFor="lp-division" className="co-zones-lg" style={{ display: "block" }}>
            বিভাগ / Division {required && "*"}
          </label>
          <select
            id="lp-division"
            className="co-select"
            disabled={disabled}
            value={value.divisionId ?? ""}
            onChange={(e) => pickDivision(num(e.target.value))}
          >
            <option value="">বিভাগ নির্বাচন করুন</option>
            {tree.divisions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="lp-district" className="co-zones-lg" style={{ display: "block" }}>
            জেলা / District {required && "*"}
          </label>
          <select
            id="lp-district"
            className="co-select"
            disabled={disabled || !division}
            value={value.districtId ?? ""}
            onChange={(e) => pickDistrict(num(e.target.value))}
          >
            <option value="">
              {division ? "জেলা নির্বাচন করুন" : "প্রথমে বিভাগ নির্বাচন করুন"}
            </option>
            {(division?.districts ?? []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Only shown when the chosen district actually has upazilas configured.
          Rendering a permanently-empty third select would read as a broken
          required field on the districts the admin hasn't broken down yet. */}
      {upazilas.length > 0 && (
        <div className="co-field">
          <label htmlFor="lp-upazila" className="co-zones-lg" style={{ display: "block" }}>
            উপজেলা / থানা
          </label>
          <select
            id="lp-upazila"
            className="co-select"
            disabled={disabled}
            value={value.upazilaId ?? ""}
            onChange={(e) => pickUpazila(num(e.target.value))}
          >
            <option value="">উপজেলা / থানা নির্বাচন করুন</option>
            {upazilas.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          <p style={{ fontSize: 12, color: "var(--ink-mute)", marginTop: 6 }}>
            আপনার থানা বেছে নিলে সঠিক ডেলিভারি চার্জ দেখানো হবে।
          </p>
        </div>
      )}
    </>
  );
}
