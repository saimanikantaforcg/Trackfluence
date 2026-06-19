"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  Link2,
  Trophy,
  DollarSign,
  User,
  Target,
  CheckCircle,
  ArrowRight,
  Menu,
  X,
  Zap,
  Shield,
  BarChart3,
  Users,
} from "lucide-react";

const features = [
  {
    icon: Link2,
    title: "Multi-Touch Attribution",
    copy:
      "First touch, last touch, linear, or time-decay — every creator gets fair credit for the full customer journey.",
  },
  {
    icon: Trophy,
    title: "Creator Scores",
    copy:
      "0–100 revenue score based on real attributed revenue, conversions, and clicks — not vanity metrics.",
  },
  {
    icon: DollarSign,
    title: "Payout Automation",
    copy:
      "Calculate commissions, bulk-approve, and download CSV in under 5 minutes. No spreadsheets.",
  },
  {
    icon: User,
    title: "Creator Portal",
    copy:
      "Every creator gets a personal dashboard — clicks, revenue, and payout history. No login required.",
  },
  {
    icon: Target,
    title: "Audience Activation",
    copy:
      "Turn creator-acquired customers into targeted segments. Push to Salesforce, Shopify, or your ESP.",
  },
  {
    icon: CheckCircle,
    title: "FTC Compliance",
    copy:
      "Auto-scan creator content for disclosure violations. Email creators before your brand gets the complaint.",
  },
];

const pricingTiers = [
  {
    name: "Free",
    price: "$0",
    period: "/month",
    description: "For individuals testing attribution.",
    cta: "Start for Free",
    href: "/register",
    features: [
      "3 creators",
      "10 tracking links",
      "50 attribution runs",
      "1 team member",
    ],
  },
  {
    name: "Starter",
    price: "$49",
    period: "/month",
    description: "For growing creator programs.",
    cta: "Start Starter",
    href: "/register",
    features: [
      "15 creators",
      "100 tracking links",
      "1,000 attribution runs",
      "3 team members",
      "5 outbound webhooks",
      "Slack & Discord alerts",
    ],
  },
  {
    name: "Growth",
    price: "$149",
    period: "/month",
    popular: true,
    description: "For serious creator-led brands.",
    cta: "Start Growth",
    href: "/register",
    features: [
      "100 creators",
      "1,000 tracking links",
      "20,000 attribution runs",
      "10 team members",
      "20 outbound webhooks",
      "Revenue forecasting",
      "White-label tracking domain",
      "Salesforce audience exports",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For brands running creator at scale.",
    cta: "Contact Sales",
    href: "/register",
    features: [
      "Unlimited everything",
      "Dedicated onboarding",
      "SLA guarantee",
      "Priority support",
      "SOC 2 documentation on request",
    ],
  },
];

const integrations = [
  "Shopify",
  "Salesforce",
  "Meta CAPI",
  "Stripe",
  "Slack",
  "Discord",
  "Resend",
  "PostHog",
  "Sentry",
];

export default function LandingPage() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold text-slate-900">
                Trackfluence
              </span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a
                href="#features"
                className="text-sm text-slate-600 hover:text-indigo-600 transition"
              >
                Features
              </a>
              <a
                href="#pricing"
                className="text-sm text-slate-600 hover:text-indigo-600 transition"
              >
                Pricing
              </a>
              <a
                href="#integrations"
                className="text-sm text-slate-600 hover:text-indigo-600 transition"
              >
                Integrations
              </a>
            </div>
            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={() => router.push("/login")}
                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition"
              >
                Sign in
              </button>
              <button
                onClick={() => router.push("/register")}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors shadow-sm"
              >
                Start Free
              </button>
            </div>
            <button
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-100 bg-white px-4 py-4 space-y-3">
            <a href="#features" className="block text-sm text-slate-600">
              Features
            </a>
            <a href="#pricing" className="block text-sm text-slate-600">
              Pricing
            </a>
            <a href="#integrations" className="block text-sm text-slate-600">
              Integrations
            </a>
            <hr className="border-slate-100" />
            <button
              onClick={() => router.push("/login")}
              className="block w-full text-left text-sm font-medium text-slate-600"
            >
              Sign in
            </button>
            <button
              onClick={() => router.push("/register")}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Start Free
            </button>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-indigo-50/30 to-white" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 border border-indigo-100 px-4 py-1.5 mb-6">
              <Zap className="h-4 w-4 text-indigo-600" />
              <span className="text-xs font-semibold text-indigo-700">
                Trusted by DTC brands tracking $2M+ in creator-attributed
                revenue
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.1]">
              Finally Know Which Creator Drove That Sale
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl leading-relaxed">
              Trackfluence connects creator activity to real revenue — so you
              can pay fairly, scale what works, and stop guessing.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => router.push("/register")}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-base font-semibold text-white hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/20"
              >
                Start Free — No Credit Card <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => router.push("/register")}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-base font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Book a Demo
              </button>
            </div>
            <p className="mt-4 text-xs text-slate-400">
              Setup takes under 10 minutes. Shopify integration in 2 clicks.
            </p>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wider mb-3">
              The Problem
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
              Creator Marketing Spend Is Up. Proof of ROI Is Still a
              Spreadsheet.
            </h2>
            <p className="mt-4 text-lg text-slate-600 leading-relaxed">
              You spend $50K on influencer campaigns. Clicks happen. Sales
              happen. But can you prove the link? With GA4's last-click model
              and promo codes that get shared everywhere, you're flying blind.
            </p>
            <ul className="mt-8 space-y-4">
              {[
                "You re-sign underperforming creators because you can't see their true ROI",
                "You lose your best creators because they can't see their impact either",
                "Payout month takes your finance team a full day — every time",
                "One FTC violation from a non-disclosing creator puts your brand at legal risk",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-1 h-5 w-5 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                    <span className="h-2 w-2 rounded-full bg-red-400" />
                  </span>
                  <span className="text-slate-600">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Solution */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wider mb-3">
            The Solution
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
            Close the Loop Between Creator and Customer
          </h2>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl">
            Trackfluence is the operating system for creator-led revenue. It
            tracks every click, matches every order, and tells you exactly —
            down to the dollar — who drove what.
          </p>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              {
                step: "1",
                title: "Creator shares link",
                copy: "Unique tracking URL captures click + session",
              },
              {
                step: "2",
                title: "Customer buys",
                copy:
                  "Order from Shopify or your server — matched to the click",
              },
              {
                step: "3",
                title: "You see the truth",
                copy:
                  "Revenue attributed, commission calculated, dashboard updated",
              },
            ].map((s) => (
              <div
                key={s.step}
                className="relative rounded-2xl bg-white border border-slate-200 p-6 shadow-sm"
              >
                <div className="h-10 w-10 rounded-full bg-indigo-600 text-white flex items-center justify-center text-lg font-bold mb-4">
                  {s.step}
                </div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600">{s.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wider mb-3">
              Platform Features
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
              Everything Your Creator Program Needs. Nothing It Doesn't.
            </h2>
          </div>
          <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-slate-200 bg-white p-6 hover:border-indigo-200 hover:shadow-md transition-all"
              >
                <div className="h-11 w-11 rounded-xl bg-indigo-50 flex items-center justify-center mb-4">
                  <f.icon className="h-5 w-5 text-indigo-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  {f.copy}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wider mb-3">
              Pricing
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
              Start Free. Scale When You're Ready.
            </h2>
          </div>
          <div className="mt-16 grid gap-6 lg:grid-cols-4">
            {pricingTiers.map((tier) => (
              <div
                key={tier.name}
                className={`relative rounded-2xl border bg-white p-6 shadow-sm flex flex-col ${
                  tier.popular
                    ? "border-indigo-600 ring-1 ring-indigo-600 shadow-lg"
                    : "border-slate-200"
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white">
                      Most Popular
                    </span>
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {tier.name}
                  </h3>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-slate-900">
                      {tier.price}
                    </span>
                    <span className="text-sm text-slate-500">
                      {tier.period}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    {tier.description}
                  </p>
                </div>
                <ul className="mt-6 space-y-3 flex-1">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-slate-600">{feature}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => router.push(tier.href)}
                  className={`mt-6 w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                    tier.popular
                      ? "bg-indigo-600 text-white hover:bg-indigo-500"
                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {tier.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section id="integrations" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wider mb-3">
              Integrations
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
              Plug In, Don't Rip Out
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Works with the tools you already use.
            </p>
          </div>
          <div className="mt-12 flex flex-wrap justify-center gap-3">
            {integrations.map((name) => (
              <span
                key={name}
                className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-2.5 text-sm font-medium text-slate-700"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <div>
              <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wider mb-3">
                Built for Trust
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
                Your Data Stays Yours
              </h2>
              <ul className="mt-8 space-y-4">
                {[
                  "JWT authentication + bcrypt password hashing",
                  "API keys shown once, stored as SHA-256 hashes only",
                  "Full audit log of every admin action",
                  "HMAC-SHA256 signed webhooks",
                  "Non-root Docker containers",
                  "Input validation on every API endpoint",
                  "CORS restricted to your domain",
                  "Rate limiting: 200 requests per user per minute",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-600">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl bg-white border border-slate-200 p-8 shadow-sm">
              <div className="grid grid-cols-2 gap-6">
                {[
                  {
                    icon: BarChart3,
                    label: "Revenue Attribution",
                    value: "4 models",
                  },
                  { icon: Users, label: "Creator Scoring", value: "0–100" },
                  {
                    icon: DollarSign,
                    label: "Payout Automation",
                    value: "< 5 min",
                  },
                  {
                    icon: Target,
                    label: "Audience Segments",
                    value: "Unlimited",
                  },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-xl bg-slate-50 p-4">
                    <stat.icon className="h-6 w-6 text-indigo-600 mb-2" />
                    <p className="text-2xl font-bold text-slate-900">
                      {stat.value}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-indigo-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Stop Guessing. Start Attributing.
          </h2>
          <p className="mt-4 text-lg text-indigo-100 max-w-2xl mx-auto">
            Your creator program is generating revenue. Trackfluence tells you
            exactly how much — and who to thank.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push("/register")}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-base font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors shadow-lg"
            >
              Start Free — No Credit Card <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => router.push("/register")}
              className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-indigo-400 bg-transparent px-6 py-3.5 text-base font-semibold text-white hover:bg-indigo-500 transition-colors"
            >
              Book a Demo
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <span className="text-lg font-bold text-white">
                  Trackfluence
                </span>
              </div>
              <p className="text-sm text-slate-400">
                Revenue Attribution & Intelligence for Creator-Led Growth.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">Product</h4>
              <ul className="space-y-2">
                {[
                  "Features",
                  "Pricing",
                  "Integrations",
                  "API Docs",
                  "Changelog",
                ].map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-sm text-slate-400 hover:text-white transition"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">Company</h4>
              <ul className="space-y-2">
                {["About", "Blog", "Careers", "Contact"].map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-sm text-slate-400 hover:text-white transition"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">Legal</h4>
              <ul className="space-y-2">
                {[
                  "Privacy Policy",
                  "Terms of Service",
                  "Cookie Policy",
                  "GDPR",
                ].map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-sm text-slate-400 hover:text-white transition"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-slate-800 text-center">
            <p className="text-sm text-slate-500">
              © 2026 Trackfluence. Revenue Attribution & Intelligence for
              Creator-Led Growth.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
