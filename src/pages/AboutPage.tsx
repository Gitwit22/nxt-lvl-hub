import { Mail, Globe, Users, Target, Eye, Lightbulb } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-12">
      {/* Header */}
      <section className="text-center py-12">
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">
          About <span className="gradient-text">Nxt Lvl Technology Solutions</span>
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Building the tools that power the next level of productivity, impact, and innovation.
        </p>
      </section>

      {/* Company Overview */}
      <section className="glass-card rounded-xl p-8">
        <h2 className="text-xl font-bold mb-3">Company Overview</h2>
        <p className="text-muted-foreground leading-relaxed">
          Nxt Lvl Technology Solutions is a forward-thinking technology company focused on creating an integrated ecosystem of software tools designed for organizations that want to operate smarter. From operations and media to education and nonprofit management, our suite of applications empowers teams to do more with less friction.
        </p>
      </section>

      {/* Mission / Vision / Why */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: Target, title: "Our Mission", text: "To democratize access to powerful software by building an interconnected suite of tools that are simple to use, affordable, and purpose-built for growing organizations." },
          { icon: Eye, title: "Our Vision", text: "A world where every organization — regardless of size — has access to enterprise-grade technology that helps them achieve their next level of impact." },
          { icon: Lightbulb, title: "Why This Suite", text: "We saw teams juggling dozens of disconnected tools. Nxt Lvl Suites brings everything together under one roof, with shared authentication, consistent design, and seamless interoperability — all planned from day one." },
        ].map(({ icon: Icon, title, text }) => (
          <div key={title} className="glass-card rounded-xl p-6">
            <Icon className="h-6 w-6 text-primary mb-3" />
            <h3 className="font-semibold mb-2">{title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
          </div>
        ))}
      </div>

      {/* Founder */}
      <section className="glass-card rounded-xl p-8">
        <h2 className="text-xl font-bold mb-4">Founder</h2>
        <div className="flex items-start gap-6">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center text-primary text-2xl font-bold shrink-0">
            F
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Founder & CEO</h3>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              Passionate about technology and its potential to transform organizations. With experience spanning software development, operations, and nonprofit leadership, the vision behind Nxt Lvl Technology Solutions is to build tools that actually work for the people who use them.
            </p>
          </div>
        </div>
      </section>

      {/* Future Team */}
      <section>
        <h2 className="text-xl font-bold mb-4">The Team</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-card rounded-xl p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-secondary mx-auto mb-3 flex items-center justify-center">
                <Users className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Team Member</p>
              <p className="text-xs text-muted-foreground/60">Coming Soon</p>
            </div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section className="glass-card rounded-xl p-8">
        <h2 className="text-xl font-bold mb-4">Contact</h2>
        <div className="flex flex-col gap-3">
          <a href="mailto:contact@nxtlvl.dev" className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors">
            <Mail className="h-4 w-4" /> contact@nxtlvl.dev
          </a>
          <a href="https://nxtlvl.dev" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors">
            <Globe className="h-4 w-4" /> nxtlvl.dev
          </a>
        </div>
      </section>

      <footer className="text-center text-sm text-muted-foreground pt-8 border-t border-border/30">
        © {new Date().getFullYear()} Nxt Lvl Technology Solutions. All rights reserved.
      </footer>
    </div>
  );
}
