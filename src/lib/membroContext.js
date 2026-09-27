import { createContext, useContext } from 'react'

export const MembroContext = createContext(null)

export function useMembro() {
  return useContext(MembroContext)
}

export function useIsAssistente() {
  const membro = useMembro()
  return membro?.ruolo === 'assistente_istruttore'
}
