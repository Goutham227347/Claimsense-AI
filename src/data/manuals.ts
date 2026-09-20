// Static insurance training manual corpus for ClaimSense AI
// Each chunk is a self-contained excerpt the model can cite verbatim.

export type ManualChunk = {
  id: string;
  manual_id: string;
  manual_title: string;
  section: string;
  page: number;
  heading: string;
  text: string;
};

export type Manual = {
  id: string;
  title: string;
  code: string;
  edition: string;
};

export const MANUALS: Manual[] = [
  { id: "pc-2024", code: "P&C-2024", title: "Property & Casualty (2024)", edition: "Vol. III" },
  { id: "auto-a102", code: "A-102", title: "Auto Comprehensive", edition: "2024" },
  { id: "comm-c500", code: "C-500", title: "Commercial Liability", edition: "2024" },
  { id: "wc-guide", code: "WC-GL", title: "Workers' Comp Guidelines", edition: "2023" },
];

export const CHUNKS: ManualChunk[] = [
  {
    id: "pc-1",
    manual_id: "pc-2024",
    manual_title: "Property & Casualty (2024)",
    section: "Sec 1.B — Loss Settlement",
    page: 42,
    heading: "Buildings under Coverage A or B",
    text: "Loss Settlement: We will pay no more than the actual cash value (ACV) of the damage until actual repair or replacement is complete. Once repairs are complete, we will settle the loss on a replacement-cost basis, provided notice of intent to repair was received within 180 days of the date of loss.",
  },
  {
    id: "pc-2",
    manual_id: "pc-2024",
    manual_title: "Property & Casualty (2024)",
    section: "Endorsement HO-04-90",
    page: 88,
    heading: "Actual Cash Value Loss Settlement — Windstorm or Hail (Roof Surfacing)",
    text: "If the roof surfacing is greater than 15 years old at the time of loss, covered property losses caused by windstorm or hail will be settled on an actual cash value basis. Replacement cost coverage on the roof surfacing is permanently waived for roofs exceeding this age threshold.",
  },
  {
    id: "pc-3",
    manual_id: "pc-2024",
    manual_title: "Property & Casualty (2024)",
    section: "Sec 4.A — Required Documentation",
    page: 110,
    heading: "Proof of Loss Submission",
    text: "The insured must submit a signed, sworn Proof of Loss within 60 days of the insurer's request. The Proof of Loss must include: (1) time and cause of loss; (2) interest of the insured and all others in the property; (3) other insurance which may cover the loss; (4) changes in title or occupancy during the term of the policy; and (5) specifications of damaged buildings and detailed estimates for repair.",
  },
  {
    id: "pc-4",
    manual_id: "pc-2024",
    manual_title: "Property & Casualty (2024)",
    section: "Sec 2.B.1.e — Exclusions",
    page: 14,
    heading: "Utility Services Failure",
    text: "We will not pay for loss or damage caused directly or indirectly by the failure of power, communication, water or other utility service supplied to the described premises, however caused, if the failure occurs away from the described premises.",
  },
  {
    id: "comm-1",
    manual_id: "comm-c500",
    manual_title: "Commercial Liability",
    section: "Form CP 04 40 — Endorsement",
    page: 3,
    heading: "Spoilage Coverage",
    text: "We will pay for direct physical loss to Perishable Stock at the described premises caused by: (a) breakdown or contamination resulting in spoilage; or (b) Power Outage, meaning interruption of electrical power, lasting more than the deductible time period, that results from a Covered Cause of Loss to utility property.",
  },
  {
    id: "comm-2",
    manual_id: "comm-c500",
    manual_title: "Commercial Liability",
    section: "Form CP 04 17",
    page: 1,
    heading: "Utility Services — Direct Damage Endorsement",
    text: "The exclusion of Utility Services in the Causes of Loss form does not apply to loss of Business Income, provided the interruption is caused by direct physical loss or damage by a Covered Cause of Loss (e.g., Windstorm) to the utility property described in the Schedule.",
  },
  {
    id: "comm-3",
    manual_id: "comm-c500",
    manual_title: "Commercial Liability",
    section: "Sec 3 — Eligibility Conditions",
    page: 22,
    heading: "Vacancy Provision",
    text: "If a building has been vacant for more than 60 consecutive days before a loss, we will: (1) not pay for any loss or damage caused by vandalism, sprinkler leakage (unless protected against freezing), building glass breakage, water damage, theft, or attempted theft; and (2) reduce the amount we would otherwise pay for the loss or damage by 15% for all other Covered Causes of Loss.",
  },
  {
    id: "auto-1",
    manual_id: "auto-a102",
    manual_title: "Auto Comprehensive",
    section: "Part D — Coverage for Damage to Your Auto",
    page: 18,
    heading: "Comprehensive (Other Than Collision)",
    text: "We will pay for direct and accidental loss to your covered auto, minus any applicable deductible, caused by: contact with a bird or animal; explosion or earthquake; fire; malicious mischief or vandalism; theft or larceny; falling objects; windstorm, hail, water or flood. Glass breakage caused by collision may be settled as a comprehensive loss at the insured's option.",
  },
  {
    id: "auto-2",
    manual_id: "auto-a102",
    manual_title: "Auto Comprehensive",
    section: "Part E — Duties After an Accident or Loss",
    page: 27,
    heading: "Required Documentation for Theft Claims",
    text: "If your covered auto is stolen, the insured must: (1) file a police report within 24 hours of discovery; (2) provide the original title or registration; (3) submit all sets of keys and remotes in the insured's possession; and (4) cooperate with the insurer's Special Investigations Unit. Failure to provide required documentation may result in denial of the claim.",
  },
  {
    id: "auto-3",
    manual_id: "auto-a102",
    manual_title: "Auto Comprehensive",
    section: "Part F — General Provisions",
    page: 33,
    heading: "Rental Reimbursement Limits",
    text: "When rental reimbursement coverage is selected, we will pay reasonable expenses incurred by the insured for the rental of a substitute vehicle, up to the per-day and aggregate limits shown in the Declarations, beginning 24 hours after the loss and ending the earliest of: (a) the date the covered auto is returned to use; (b) the date we pay for its loss; or (c) the policy aggregate limit is exhausted.",
  },
  {
    id: "wc-1",
    manual_id: "wc-guide",
    manual_title: "Workers' Comp Guidelines",
    section: "Ch. 2 — Reporting Requirements",
    page: 9,
    heading: "First Report of Injury",
    text: "Employers must file the First Report of Injury (Form WC-1) with the carrier within 7 calendar days of receiving notice of a work-related injury that results in more than one day of lost time, medical treatment beyond first aid, or death. Late filing may result in penalties assessed against the employer.",
  },
  {
    id: "wc-2",
    manual_id: "wc-guide",
    manual_title: "Workers' Comp Guidelines",
    section: "Ch. 4 — Indemnity Benefits",
    page: 21,
    heading: "Temporary Total Disability (TTD) Eligibility",
    text: "An injured worker is eligible for TTD benefits when a treating physician certifies the worker is unable to perform any work for more than the statutory waiting period (typically 7 days). Benefits are payable at 66 2/3% of the average weekly wage, subject to the state maximum and minimum, and continue until the worker reaches maximum medical improvement or is released to work.",
  },
];
