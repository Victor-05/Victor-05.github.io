import { createContext, useContext } from 'react'

// Shared access to the single lead form and print report (all pages).
export const LeadContext = createContext({ openLead: () => {}, openPrint: () => {}, lastLead: null })
export const useLead = () => useContext(LeadContext)
