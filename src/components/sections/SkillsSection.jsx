import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  DiJavascript1,
  DiReact,
  DiNodejs,
  DiMongodb,
  DiGit,
  DiJava,
} from "react-icons/di";
import {
  SiMysql,
  SiExpress,
  SiDocker,
  SiHtml5,
  SiArduino,
  SiCplusplus,
} from "react-icons/si";

const skills = [
  // Frontend
  { name: "HTML/CSS", icon: SiHtml5, category: "frontend" },
  { name: "JavaScript", icon: DiJavascript1, category: "frontend" },
  { name: "React", icon: DiReact, category: "frontend" },

  // Backend
  { name: "Node.js", icon: DiNodejs, category: "backend" },
  { name: "Express", icon: SiExpress, category: "backend" },
  { name: "MongoDB", icon: DiMongodb, category: "backend" },
  { name: "MySQL", icon: SiMysql, category: "backend" },

  // Embedded Systems
  { name: "Arduino", icon: SiArduino, category: "embedded" },
  { name: "ESP32", icon: SiArduino, category: "embedded" },
  { name: "C/C++", icon: SiCplusplus, category: "embedded" },

  // Tools & Others
  { name: "Git", icon: DiGit, category: "tools" },
  { name: "Docker", icon: SiDocker, category: "tools" },
  { name: "Java", icon: DiJava, category: "tools" },
];

const categories = ["all", "frontend", "backend", "embedded", "tools"];

export const SkillsSection = () => {
  const [activeCategory, setActiveCategory] = useState("all");

  const filteredSkills = skills.filter(
    (skill) => activeCategory === "all" || skill.category === activeCategory
  );
  return (
    <section id="skills" className="py-24 px-4 relative bg-secondary/30">
      <div className="container mx-auto max-w-5xl">
        <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center">
          My <span className="text-primary"> Skills</span>
        </h2>

        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {categories.map((category, key) => (
            <button
              key={key}
              onClick={() => setActiveCategory(category)}
              className={cn(
                "px-5 py-2 rounded-full transition-colors duration-300 capitalize",
                activeCategory === category
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/70 text-forefround hover:bd-secondary"
              )}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {filteredSkills.map((skill, key) => {
            const Icon = skill.icon;
            return (
              <div
                key={key}
                className="bg-card p-6 rounded-lg shadow-xs card-hover flex flex-col items-center justify-center gap-3 group"
              >
                <Icon className="text-6xl text-primary group-hover:scale-110 transition-transform duration-300" />
                <h3 className="font-semibold text-sm text-center">
                  {skill.name}
                </h3>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
