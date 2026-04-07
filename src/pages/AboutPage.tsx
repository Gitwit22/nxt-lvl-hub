import { Mail, Globe, Users, Target, Eye, Lightbulb } from "lucide-react";
import { Screw } from "@/components/Screw";

export default function AboutPage() {
  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-10">
      {/* Header Panel */}
      <section className="metal-panel rounded-xl p-10 text-center relative">
        <Screw className="absolute top-4 left-4" />
        <Screw className="absolute top-4 right-4" />
        <Screw className="absolute bottom-4 left-4" />
        <Screw className="absolute bottom-4 right-4" />
        <div className="stamped-label text-[9px] mb-3">System Info</div>
        <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight mb-3 font-mono">
          <span className="gradient-text">NXT LVL TECHNOLOGY SOLUTIONS</span>
        </h1>
        <p className="text-muted-foreground text-sm max-w-lg mx-auto">
          Building the tools that power the next level of productivity, impact, and innovation.
        </p>
      </section>

      {/* Overview */}
      <section className="metal-raised rounded-lg p-8 relative">
        <Screw className="absolute top-3 left-3" />
        <Screw className="absolute top-3 right-3" />
        <h2 className="stamped-label text-[10px] mb-3">Company Overview</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Nxt Lvl Technology Solutions is a forward-thinking technology company focused on creating an integrated ecosystem of software tools designed for organizations that want to operate smarter. From operations and media to education and nonprofit management, our suite of applications empowers teams to do more with less friction.
        </p>
      </section>

      {/* Mission / Vision / Why */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          { icon: Target, title: "MISSION", text: "To democratize access to powerful software by building an interconnected suite of tools that are simple to use, affordable, and purpose-built for growing organizations." },
          { icon: Eye, title: "VISION", text: "A world where every organization — regardless of size — has access to enterprise-grade technology that helps them achieve their next level of impact." },
          { icon: Lightbulb, title: "WHY THIS SUITE", text: "We saw teams juggling dozens of disconnected tools. Nxt Lvl Suites brings everything together under one roof, with shared authentication, consistent design, and seamless interoperability." },
        ].map(({ icon: Icon, title, text }) => (
          <div key={title} className="metal-panel rounded-lg p-6 relative">
            <Screw className="absolute top-2.5 left-2.5" />
            <Screw className="absolute top-2.5 right-2.5" />
            <Icon className="h-5 w-5 text-primary mb-3" />
            <h3 className="font-mono font-semibold text-[10px] uppercase tracking-widest text-foreground mb-2">{title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{text}</p>
          </div>
        ))}
      </div>

      {/* Founder */}
      <section className="metal-raised rounded-lg p-8 relative">
        <Screw className="absolute top-3 left-3" />
        <Screw className="absolute top-3 right-3" />
        <h2 className="stamped-label text-[10px] mb-4">Founder</h2>
        <div className="flex items-start gap-5">
          <div className="w-14 h-14 rounded metal-panel flex items-center justify-center text-primary text-xl font-mono font-bold shrink-0">
            F
          </div>
          <div>
            <h3 className="font-mono font-semibold text-foreground text-sm">Founder & CEO</h3>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Passionate about technology and its potential to transform organizations. With experience spanning software development, operations, and nonprofit leadership, the vision behind Nxt Lvl Technology Solutions is to build tools that actually work for the people who use them.
            </p>
          </div>
        </div>
      </section>

      {/* Team */}
      <section>
        <h2 className="stamped-label text-[10px] mb-4">The Team</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="metal-panel rounded-lg p-5 text-center relative">
              <Screw className="absolute top-2 left-2" />
              <Screw className="absolute top-2 right-2" />
              <div className="w-10 h-10 rounded-full metal-raised mx-auto mb-3 flex items-center justify-center">
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-xs font-mono text-muted-foreground">TBD</p>
              <p className="text-[9px] stamped-label">Coming Soon</p>
            </div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section className="metal-raised rounded-lg p-8 relative">
        <Screw className="absolute top-3 left-3" />
        <Screw className="absolute top-3 right-3" />
        <h2 className="stamped-label text-[10px] mb-4">Contact</h2>
        <div className="flex flex-col gap-3">
          <a href="mailto:contact@nxtlvl.dev" className="flex items-center gap-3 text-xs text-muted-foreground hover:text-primary transition-colors font-mono">
            <Mail className="h-4 w-4" /> contact@nxtlvl.dev
          </a>
          <a href="https://nxtlvl.dev" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-xs text-muted-foreground hover:text-primary transition-colors font-mono">
            <Globe className="h-4 w-4" /> nxtlvl.dev
          </a>
        </div>
      </section>

      <footer className="text-center stamped-label text-[9px] pt-6 border-t border-border/30">
        © {new Date().getFullYear()} Nxt Lvl Technology Solutions
      </footer>
    </div>
  );
}
