export type Agent = {
  /** Stable id used by the UI dropdown. */
  id: string;
  /** Display + DocuSign recipient name. */
  name: string;
  /** DocuSign recipient email (where the counter-sign request is sent). */
  email: string;
};

// The list of listing agents who can be the counter-signer.
// To add or remove an agent, edit this array (the first entry is the default).
export const AGENTS: Agent[] = [
  { id: "ian", name: "Ian Tudor", email: "ian.b.tudor@gmail.com" },
  {
    id: "federico",
    name: "Federico Salvatori",
    email: "federico@thesalvatorigroup.com",
  },
];

export function getAgentById(id: string | undefined | null): Agent | undefined {
  if (!id) return undefined;
  return AGENTS.find((a) => a.id === id);
}

export const DEFAULT_AGENT: Agent = AGENTS[0];
