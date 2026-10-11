'use client'

import { useSyncExternalStore } from 'react'
import { toast } from 'sonner'
import { demo, FinanceError, stateSchema, validateState, type State } from './finance'

const STORAGE_KEY = 'moneymap:v2'
const serverSnapshot = demo()
const listeners = new Set<() => void>()
let current: State | null = null

function readStorage(): State {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = stateSchema.safeParse(JSON.parse(raw))
      if (parsed.success) return validateState(parsed.data)
    }
  } catch {
    // Corrupted or inaccessible storage falls back to demo data.
  }
  return demo()
}

function getSnapshot(): State {
  current ??= readStorage()
  return current
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return
    current = readStorage()
    listener()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

export function useFinance(): State {
  return useSyncExternalStore(subscribe, getSnapshot, () => serverSnapshot)
}

function persist(next: State) {
  current = next
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Storage may be full or disabled; in-memory state still works for this session.
  }
  listeners.forEach(l => l())
}

/** Runs a pure state transition; on failure the actual state is left untouched. */
export function commit(transition: (s: State) => State, success?: string): boolean {
  try {
    const next = transition(getSnapshot())
    if (next !== current) persist(next)
    if (success) toast.success(success)
    return true
  } catch (error) {
    toast.error(error instanceof FinanceError ? error.message : 'Something went wrong. Your data was not changed.')
    return false
  }
}

export function resetDemo() {
  persist(demo())
  toast.success('Demo data restored.')
}

export function newId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}
