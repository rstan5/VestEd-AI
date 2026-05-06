import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Brain, BarChart3, Trophy, TrendingUp, Zap, Users, ArrowRight, Instagram, GraduationCap } from "lucide-react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import logo from "@/assets/logo.png";

const features = [
  {
    icon: Brain,
    title: "AI Portfolio Professor",
    description: "Upload your portfolio and get hedge-fund-level analysis. Strengths, weaknesses, and what-if scenarios — explained like a real mentor.",
  },
  {
    icon: BarChart3,
    title: "Paper Trading Arena",
    description: "Start with fake cash, trade with live market data. Build real skills with zero risk. Track your P&L like a pro.",
  },
  {
    icon: Trophy,
    title: "College Competitions",
    description: "Join your school's investment club. Compete head-to-head against other universities. Climb the leaderboard.",
  },
  {
    icon: Zap,
    title: "Signal Prestige",
    description: "Prove to employers that you are superior by finally getting the chance to compete with the best business students.",
  },
];

const capabilities = [
  { icon: BarChart3, label: "Trade Lab", sub: "Build skill without risking a dollar" },
  { icon: Trophy, label: 'Real-World Competition', sub: "Compete with students" },
  { icon: TrendingUp, label: "Real Market Data", sub: "Stock prices wired in from the live market" },
  { icon: Brain, label: "AI Investment Coach", sub: "Learn strategies, not just returns" },
];

const LandingPage = () => {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />

        <div className="container relative z-10 mx-auto px-4 text-center pt-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8">
              <Zap className="w-4 h-4" />
              Become the 1%
            </div>

            <p className="font-display font-bold text-foreground mb-2 text-2xl md:text-4xl lg:text-5xl">
              Invest, Compete,
            </p>
            <h1 className="font-display font-black leading-none tracking-tighter text-gradient-primary neon-glow-text text-[28vw] md:text-[24vw]">
              WIN.
            </h1>
            <p className="font-display font-bold text-foreground mb-6 -mt-2 md:-mt-4 text-2xl md:text-4xl lg:text-5xl">
              with VestEd
            </p>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed whitespace-pre-line">
              {"Prove to employers that YOU can win in real world competition. Business professors show slides in a lecture hall, VestEd gives you the ability to outrank even the Ivy Leagues on leaderboards to prove you are the best candidate in finance."}
            </p>
            <p className="font-display text-lg md:text-xl font-bold text-foreground max-w-2xl mx-auto mb-10 leading-relaxed whitespace-pre-line">
              {"Join VestEd NOW as a beta user and\nget FREE lifetime access."}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
              <Link to="/analyze" className="w-full">
                <Button variant="hero" size="lg" className="text-base py-6 w-full">
                  Portfolio Professor
                  <ArrowRight className="w-5 h-5 ml-1" />
                </Button>
              </Link>
              <Link to="/compete" className="w-full">
                <Button variant="hero-outline" size="lg" className="text-base py-6 w-full">
                  Start Competing
                  <ArrowRight className="w-5 h-5 ml-1" />
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Capabilities */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20 max-w-4xl mx-auto"
          >
            {capabilities.map((cap) => (
              <div key={cap.label} className="glass-card rounded-xl p-4 text-center border-2 border-primary/30 hover:neon-border transition-all duration-300">
                <cap.icon className="w-6 h-6 text-primary mx-auto mb-2" />
                <div className="font-display text-sm font-semibold text-foreground">{cap.label}</div>
                <div className="text-xs text-muted-foreground mt-1">{cap.sub}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Rep Your College preview */}
      <section className="py-24 relative">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="text-primary font-display font-bold text-sm tracking-widest mb-4">COMPETE</div>
              <h2 className="font-display text-4xl md:text-6xl font-bold leading-tight mb-6">
                Rep Your <span className="text-gradient-primary">NAME.</span>
              </h2>
              <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
                Join your school's investment club, build your portfolio, and compete against the Ivy Leagues. Solo or team — you choose how to play.
              </p>
              <div className="space-y-4 mb-8">
                {[
                  { icon: GraduationCap, text: "Link your profile to your college's investment club" },
                  { icon: Users, text: "Collaborate with teammates on strategy or build solo" },
                  { icon: Trophy, text: "Climb leaderboards and prove that YOU are the best in candidate" },
                ].map((item) => (
                  <div key={item.text} className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <item.icon className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-foreground">{item.text}</span>
                  </div>
                ))}
              </div>
              <Link to="/compete">
                <Button variant="hero" size="lg" className="text-base px-8 py-6">
                  Join a Competition
                  <ArrowRight className="w-5 h-5 ml-1" />
                </Button>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="glass-card rounded-2xl p-6 neon-border"
            >
              <div className="flex items-center justify-between mb-5 pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <Trophy className="w-6 h-6 text-primary" />
                  <span className="font-display font-bold text-lg">National Leaderboard</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  Live <span className="w-2 h-2 rounded-full bg-gain animate-pulse" />
                </div>
              </div>
              <div className="space-y-1">
                {[
                  { rank: 1, name: "MIT Investors Club", members: 48, ret: "+24.3%" },
                  { rank: 2, name: "Stanford Finance Society", members: 35, ret: "+21.7%" },
                  { rank: 3, name: "Wharton Trading Group", members: 62, ret: "+19.2%" },
                  { rank: 4, name: "Berkeley Econ Club", members: 29, ret: "+17.8%" },
                  { rank: 5, name: "NYU Stern Investors", members: 41, ret: "+15.4%" },
                ].map((row) => (
                  <div key={row.rank} className="flex items-center justify-between py-3 px-2 rounded-lg hover:bg-primary/5 transition-colors">
                    <div className="flex items-center gap-4">
                      <span className={`font-display text-xl font-bold w-6 ${row.rank <= 3 ? "text-primary" : "text-muted-foreground"}`}>
                        {row.rank}
                      </span>
                      <div>
                        <div className="font-display font-semibold text-foreground">{row.name}</div>
                        <div className="text-xs text-muted-foreground">{row.members} members</div>
                      </div>
                    </div>
                    <span className="font-display font-bold text-gain">{row.ret}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 relative">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-display text-3xl md:text-5xl font-bold mb-4">
              Stand Out to <span className="text-gradient-primary">Employers</span>.
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto whitespace-pre-line">
              No lecture hall fluff, just career-relavent skill.{"\n"}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card rounded-2xl p-8 border-2 border-primary/30 hover:neon-border transition-all duration-300 group"
              >
                <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mb-5 group-hover:neon-glow transition-all">
                  <feature.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="font-display text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 relative">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="glass-card rounded-3xl p-12 md:p-16 text-center neon-border max-w-4xl mx-auto"
          >
            <Users className="w-12 h-12 text-primary mx-auto mb-6" />
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              Ready to Join the <span className="text-gradient-accent">Arena?</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-8">
              Link up with your university's investment club, start competing, and build 
              the skills that actually matter on Wall Street.
            </p>
            <Link to="/compete">
              <Button variant="hero" size="lg" className="text-base px-10 py-6">
                Find Your School
                <Trophy className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 relative">
        <div className="container mx-auto px-4 max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="font-display text-3xl md:text-5xl font-bold mb-4">
              Frequently Asked <span className="text-gradient-primary">Questions</span>
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Accordion type="single" collapsible className="space-y-3">
              {[
                { q: "What is VestEd?", a: "VestEd is an AI-powered investment platform built for students and college investment clubs. It combines portfolio analysis, simulated trading, and real-time competitions to help you learn investing by actually doing it." },
                { q: "Who is VestEd for?", a: "VestEd is designed for students, especially those in college investment clubs or interested in finance, trading, or breaking into competitive careers like hedge funds or investment banking." },
                { q: "Is this real trading with real money?", a: "No—VestEd uses simulated trading with real market data. You can practice, compete, and learn without risking real money." },
                { q: "How are competitions structured?", a: "Users can join competitions individually or through their college. Performance is tracked through leaderboards, allowing you to compete against other students and schools." },
                { q: "What makes VestEd different from other paper trading apps?", a: "VestEd goes beyond basic simulation by focusing on learning and competition. With AI-powered portfolio insights and structured challenges, you don't just trade—you understand why your strategies work (or don't)." },
                { q: "What is the AI Portfolio Professor?", a: "It's your built-in AI coach that analyzes your portfolio, explains your performance, and gives personalized insights to help you improve your investing strategy." },
                { q: "When will VestEd launch?", a: "VestEd is currently in early access. Join the waitlist to be among the first users and get priority access when we launch." },
              ].map((faq, i) => (
                <AccordionItem key={i} value={`faq-${i}`} className="glass-card rounded-xl px-6 border-2 border-primary/30">
                  <AccordionTrigger className="text-left font-display font-semibold text-base hover:no-underline">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex items-center gap-2">
              <img src={logo} alt="VestEd logo" className="w-8 h-8 object-contain" />
              <span className="font-display text-lg font-bold text-foreground">VestEd</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 border-l border-border pl-4">
                <a href="https://www.instagram.com/vested.ai/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                  <Instagram className="w-5 h-5" />
                </a>
                <a href="https://www.tiktok.com/@vested.ai" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                  </svg>
                </a>
              </div>
              <div className="border-l border-border pl-4 text-muted-foreground text-sm">
                © 2026 VestEd. Invest. Compete. Win.
              </div>
              <div className="border-l border-border pl-4 text-muted-foreground text-sm">
                vestedaiownership@gmail.com
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
