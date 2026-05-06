import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Sparkles, Lock } from "lucide-react";
import { Link } from "react-router-dom";

const PricingPage = () => {
  return (
    <main className="min-h-screen pt-24 pb-16 px-4">
      <div className="container mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="font-display text-4xl md:text-6xl font-bold mb-4">
            Pricing
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Get in early. Beta users get FREE lifetime access to everything VestEd has to offer.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="glass-card neon-border p-8 h-full flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <span className="text-sm font-semibold text-primary uppercase tracking-wider">
                  Beta Access
                </span>
              </div>
              <h2 className="font-display text-3xl font-bold mb-2">FREE</h2>
              <p className="text-muted-foreground mb-6">
                Be one of our first users and lock in lifetime access at no cost.
              </p>
              <ul className="space-y-3 mb-8 flex-1">
                {[
                  "AI Portfolio Professor",
                  "Paper Trading with live market data",
                  "College & club competitions",
                  "Investment chatbot assistant",
                  "FREE lifetime access — no credit card",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-foreground">{item}</span>
                  </li>
                ))}
              </ul>
              <Link to="/auth?mode=signup">
                <Button variant="hero" className="w-full">
                  Claim Free Beta Access
                </Button>
              </Link>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="glass-card p-8 h-full flex flex-col border-border/40">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Coming Soon
                </span>
              </div>
              <h2 className="font-display text-3xl font-bold mb-2">Pro</h2>
              <p className="text-muted-foreground mb-6">
                Additional advanced features will be released later and require a paid subscription.
              </p>
              <ul className="space-y-3 mb-8 flex-1">
                {[
                  "Advanced AI portfolio strategies",
                  "Real-time options & crypto trading sims",
                  "Premium market data & analytics",
                  "Priority access to new features",
                  "Exclusive competitions & prizes",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="w-full" disabled>
                Coming Soon
              </Button>
            </Card>
          </motion.div>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-10">
          Beta users keep their free access even after paid plans launch.
        </p>
      </div>
    </main>
  );
};

export default PricingPage;
