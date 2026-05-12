import { Compressor } from "@/components/compressor";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-6 md:p-12 lg:p-24 relative overflow-hidden">
      {/* Background ambient light */}
      <div className="absolute top-0 inset-x-0 h-64 bg-primary/10 blur-[100px] pointer-events-none -z-10" />
      
      <div className="z-10 w-full max-w-5xl flex flex-col items-center text-center gap-4 mb-16">
        <div className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-sm font-medium text-foreground mb-4">
          <span className="flex h-2 w-2 rounded-full bg-primary mr-2"></span>
          100% Client-Side. No server uploads.
        </div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
          Squeeze your images. <br className="hidden md:block" />
          <span className="text-primary">Without losing quality.</span>
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl">
          A lightning-fast, modern image compression tool. Works entirely in your browser. 
          Perfect for Vercel edge environments and strict privacy requirements.
        </p>
      </div>

      <div className="w-full max-w-4xl z-10">
        <Compressor />
      </div>
    </main>
  );
}
