'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect } from 'react'

const API_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || 'phc_NNJrGRLnopoR73cofmbbHEG05S2kSfCz93nQVOJlxQH'
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://telemetry.getplexo.com'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    posthog.init(API_KEY, {
      api_host: HOST,
      person_profiles: 'identified_only',
      capture_pageview: true,
      capture_pageleave: true,
      // Tag all events from this service
      bootstrap: {
        featureFlags: {},
      },
    })
    // Identify this as the admin service
    posthog.register({
      service: 'gateway-admin',
      environment: process.env.NODE_ENV || 'production',
    })
  }, [])

  return <PHProvider client={posthog}>{children}</PHProvider>
}
