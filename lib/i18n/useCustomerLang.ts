'use client'

import { useState, useEffect, useCallback } from 'react'
import { customerDictionary, CustomerLang } from './customerDictionary'

const STORAGE_KEY = 'retcash_customer_lang'
const LANG_EVENT = 'retcash-lang-change'

export function useCustomerLang() {
  const [lang, setLangState] = useState<CustomerLang>('en')

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as CustomerLang | null
    if (saved === 'en' || saved === 'ta' || saved === 'si') {
      setLangState(saved)
    }

    const handleSync = () => {
      const latest = localStorage.getItem(STORAGE_KEY) as CustomerLang | null
      if (latest === 'en' || latest === 'ta' || latest === 'si') {
        setLangState(latest)
      }
    }

    window.addEventListener(LANG_EVENT, handleSync)
    window.addEventListener('storage', handleSync)
    return () => {
      window.removeEventListener(LANG_EVENT, handleSync)
      window.removeEventListener('storage', handleSync)
    }
  }, [])

  const setLang = useCallback((nextLang: CustomerLang) => {
    setLangState(nextLang)
    localStorage.setItem(STORAGE_KEY, nextLang)
    window.dispatchEvent(new Event(LANG_EVENT))
  }, [])

  return {
    lang,
    setLang,
    t: customerDictionary[lang],
  }
}