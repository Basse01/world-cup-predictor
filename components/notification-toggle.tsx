'use client'
import { usePushNotifications } from '@/hooks/usePushNotifications'

function isRunningAsStandalone() {
  if (typeof window === 'undefined') return false
  return (
    ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true) ||
    window.matchMedia('(display-mode: standalone)').matches
  )
}

export default function NotificationToggle() {
  const { pushState, subscribe, unsubscribe } = usePushNotifications()

  if (pushState === 'unsupported') {
    const standalone = isRunningAsStandalone()
    return (
      <p className="text-xs text-white/40">
        {standalone
          ? 'Push-notiser kräver iOS 16.4 eller senare.'
          : 'Lägg till appen på hemskärmen för att aktivera push-notiser.'}
      </p>
    )
  }

  const isEnabled = pushState === 'granted'
  const isDenied = pushState === 'denied'

  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm text-wc-light-gray font-medium">Push-notiser</div>
        <div className="text-xs text-white/50 mt-0.5">
          {isEnabled
            ? 'Matchpåminnelser och chattmeddelanden'
            : isDenied
            ? 'Blockerade i webbläsarens inställningar'
            : 'Inaktiverade'}
        </div>
      </div>
      {!isDenied && (
        <button
          onClick={isEnabled ? unsubscribe : subscribe}
          aria-label={isEnabled ? 'Stäng av notiser' : 'Slå på notiser'}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none ${
            isEnabled ? 'bg-wc-green' : 'bg-[#2a2a2a]'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              isEnabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      )}
    </div>
  )
}
