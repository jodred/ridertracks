import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Car,
  Fuel,
  Wallet,
  TrendingUp,
  Receipt,
  PieChart,
  Coins,
  ShieldCheck,
  BarChart3,
  Sparkles,
  Check,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RideTracks — Track every ride. Know every złoty." },
      {
        name: "description",
        content:
          "RideTracks is the all-in-one business dashboard for taxi and rideshare drivers. Track earnings, expenses, fleet deductions, cash payments, and profit with complete clarity.",
      },
      { property: "og:title", content: "RideTracks — Track every ride. Know every złoty." },
      {
        property: "og:description",
        content:
          "RideTracks is the all-in-one business dashboard for taxi and rideshare drivers. Track earnings, expenses, fleet deductions, cash payments, and profit with complete clarity.",
      },
      { name: "twitter:title", content: "RideTracks — Track every ride. Know every złoty." },
      {
        name: "twitter:description",
        content: "RideTracks is the all-in-one business dashboard for taxi and rideshare drivers. Track earnings, expenses, fleet deductions, cash payments, and profit with complete clarity.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Car className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight">RideTracks</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
          <a href="#features" className="hover:text-foreground">Features</a>
          <a href="#how" className="hover:text-foreground">How it works</a>
          <a href="#fleet" className="hover:text-foreground">Fleet</a>
          <a href="#faq" className="hover:text-foreground">FAQ</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            to="/dashboard"
            className="hidden rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-accent sm:inline-flex"
          >
            Sign in
          </Link>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Get started
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Built for professional drivers
          </div>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            Track your rides.<br />
            <span className="text-primary">Know  your earnings.</span>
          </h1>
          <p className="mt-5 max-w-lg text-lg text-muted-foreground">
            RideTracks helps taxi and rideshare drivers track earnings, expenses, fleet deductions,
            and real profit—all in one place. Uber, Bolt, Free Now, or a local taxi—it just works.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-soft hover:opacity-90"
            >
              Get started free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#how"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-3 text-sm font-semibold hover:bg-accent"
            >
              Watch demo
            </a>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" /> No spreadsheets</span>
            <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" /> Any fleet, any rules</span>
            <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" /> Free to start</span>
          </div>
        </div>

        {/* Dashboard mockup */}
        <div className="relative">
          <div className="rounded-3xl border border-border bg-card p-4 shadow-card">
            <div className="rounded-2xl bg-secondary/40 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-xs font-medium text-muted-foreground">Overview · This Week</div>
                <div className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Live</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <MockCard label="Gross" value="4,820.50 zł" tone="default" />
                <MockCard label="Partner Payment" value="3,863.06 zł" tone="default" />
                <MockCard label="Cash Wallet" value="185.50 zł" tone="default" />
                <MockCard label="Net Profit" value="2,940.10 zł" tone="primary" />
              </div>
              <div className="mt-3 flex h-24 items-end gap-1.5 rounded-xl bg-card p-3">
                {[35, 55, 42, 78, 60, 92, 70].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-md bg-primary/70"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="absolute -bottom-6 -left-4 hidden w-48 rounded-2xl border border-border bg-card p-3 shadow-card sm:block">
            <div className="text-[10px] font-medium text-muted-foreground">Today · Mobile</div>
            <div className="mt-1 text-lg font-semibold tabular-nums">687.20 zł</div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div className="h-full w-3/4 rounded-full bg-primary" />
            </div>
          </div>
        </div>
      </section>

      {/* Platforms */}
      <section className="border-y border-border bg-secondary/30 py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-center text-sm font-medium text-muted-foreground">
            Built for every professional driver
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
            {["Uber", "Bolt", "Free Now", "Taxi", "Fleet Drivers", "Owner Drivers"].map((p) => (
              <div
                key={p}
                className="rounded-xl border border-border bg-card px-4 py-3 text-center text-sm font-medium"
              >
                {p}
              </div>
            ))}
          </div>
          <p className="mx-auto mt-6 max-w-2xl text-center text-sm text-muted-foreground">
            RideTracks works with any taxi or rideshare platform because commissions, deductions,
            and expenses are fully customizable.
          </p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Everything you need to manage your driving business
          </h2>
          <p className="mt-3 text-muted-foreground">
            Simple to use. Powerful enough for any fleet.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Feature icon={Coins} title="Track Earnings" desc="Log your daily revenue in seconds." />
          <Feature icon={Car} title="Fleet Payments" desc="Automatically calculate what your fleet partner should pay you." />
          <Feature icon={Fuel} title="Expenses" desc="Track fuel, food, repairs, parking, tolls, and every business expense." />
          <Feature icon={TrendingUp} title="Real Profit" desc="Know exactly how much money you actually made after deductions." />
          <Feature icon={Wallet} title="Cash Wallet" desc="Track passenger cash and always know how much cash you still have." />
          <Feature icon={BarChart3} title="Reports" desc="Weekly, monthly and custom reports ready whenever you need them." />
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="bg-secondary/30 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">How it works</h2>
            <p className="mt-3 text-muted-foreground">Three steps. Every day.</p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            <Step n={1} title="Record earnings" desc="Add gross revenue and cash collected." />
            <Step n={2} title="Add expenses" desc="Fuel, food, parking, repairs, other." />
            <Step n={3} title="See your profit" desc="Fleet deductions, weekly fees, cash wallet and profit — computed automatically." />
          </div>
        </div>
      </section>

      {/* Why */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Why drivers choose RideTracks</h2>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
          <BigCard icon={Sparkles} title="Save time" desc="Stop juggling spreadsheets. One clean dashboard." />
          <BigCard icon={Receipt} title="Stay organized" desc="Every ride, expense, and receipt in one place." />
          <BigCard icon={PieChart} title="Know your profit" desc="See what you actually keep — not just what you earn." />
        </div>
      </section>

      {/* Fleet Support */}
      <section id="fleet" className="bg-secondary/30 py-20">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <ShieldCheck className="h-3.5 w-3.5" /> Flexible fleet rules
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              Flexible enough for every fleet
            </h2>
            <p className="mt-4 text-muted-foreground">
              RideTracks lets you configure how your fleet takes its share — percentage or fixed,
              gross or net, single or multiple deductions, plus weekly platform fees and VAT.
              However your fleet calculates payments, we match it.
            </p>
          </div>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              "Multiple commission rates",
              "Percentage or fixed deductions",
              "Gross or net calculations",
              "Weekly platform fees",
              "VAT deductions",
              "Custom deduction rules",
            ].map((t) => (
              <li
                key={t}
                className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium"
              >
                <Check className="h-4 w-4 text-primary" /> {t}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Perfect for */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Perfect for</h2>
        </div>
        <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {["Uber Drivers", "Bolt Drivers", "Free Now Drivers", "Licensed Taxi Drivers", "Fleet Drivers", "Owner Operators"].map((t) => (
            <div key={t} className="rounded-2xl border border-border bg-card p-5 text-sm font-medium">
              <Car className="mb-3 h-5 w-5 text-primary" />
              {t}
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-secondary/30 py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-semibold tracking-tight sm:text-4xl">
            Frequently asked questions
          </h2>
          <div className="mt-10 space-y-3">
            <FAQ q="Does RideTracks only work for Uber?" a="No. It works with Uber, Bolt, Free Now, traditional taxi companies, and independent drivers." />
            <FAQ q="Can I configure my fleet deductions?" a="Yes. Multiple commissions, VAT, weekly fees, and custom deduction rules — all configurable." />
            <FAQ q="Can I track cash trips?" a="Yes. RideTracks includes a built-in cash wallet that updates automatically." />
            <FAQ q="Can I upload fuel receipts?" a="Yes. Attach receipts and invoices to any expense." />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Stop guessing your earnings.
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          Start tracking every ride, every expense, and every payout in one place.
        </p>
        <Link
          to="/dashboard"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-soft hover:opacity-90"
        >
          Create your free account
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:px-6">
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Car className="h-4 w-4" />
            </div>
            <span className="font-medium text-foreground">RideTracks</span>
            <span>© {new Date().getFullYear()}</span>
          </div>
          <nav className="flex flex-wrap gap-4">
            <a href="#features">Features</a>
            <a href="#faq">FAQ</a>
            <a href="#" className="hover:text-foreground">Privacy</a>
            <a href="#" className="hover:text-foreground">Terms</a>
            <a href="#" className="hover:text-foreground">Contact</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function MockCard({ label, value, tone }: { label: string; value: string; tone: "default" | "primary" }) {
  return (
    <div
      className={`rounded-xl p-3 ${tone === "primary" ? "bg-primary text-primary-foreground" : "bg-card"}`}
    >
      <div className={`text-[10px] ${tone === "primary" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function Feature({ icon: Icon, title, desc }: { icon: typeof Car; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div className="mt-4 text-base font-semibold">{title}</div>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
      <div className="grid h-9 w-9 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
        {n}
      </div>
      <div className="mt-4 text-base font-semibold">{title}</div>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

function BigCard({ icon: Icon, title, desc }: { icon: typeof Car; title: string; desc: string }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-8 shadow-card">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="h-6 w-6" />
      </div>
      <div className="mt-5 text-xl font-semibold">{title}</div>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

function FAQ({ q, a }: { q: string; a: string }) {
  return (
    <details className="group rounded-2xl border border-border bg-card p-5 open:shadow-card">
      <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold">
        {q}
        <span className="text-muted-foreground transition-transform group-open:rotate-45">＋</span>
      </summary>
      <p className="mt-3 text-sm text-muted-foreground">{a}</p>
    </details>
  );
}
