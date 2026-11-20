import { createContext, useContext } from 'react'

// Shared access to the single lead form (evaluator + digital twin).
export const LeadContext = createContext({ openLead: () => {}, lastLead: null })
export const useLead = () => useContext(LeadContext)
