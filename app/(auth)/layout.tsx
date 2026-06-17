export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-wc-black flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-display text-5xl text-wc-red tracking-wider">VM 2026</h1>
          <p className="text-wc-dark-gray text-sm mt-1 uppercase tracking-widest">Prediction League</p>
        </div>
        {children}
      </div>
    </div>
  )
}
