import Aurora from "@/components/Aurora";
import AccentTracker from "@/components/AccentTracker";
import Loader from "@/components/Loader";
import MobileNotice from "@/components/MobileNotice";
import Cursor from "@/components/Cursor";
import ScrollSpine from "@/components/ScrollSpine";
import TopBar from "@/components/TopBar";
import Hero from "@/components/Hero";
import Divider from "@/components/Divider";
import About from "@/components/About";
import Projects from "@/components/Projects";
import Experiments from "@/components/Experiments";
import GithubActivity from "@/components/GithubActivity";
import Leadership from "@/components/Leadership";
import Community from "@/components/Community";
import Recommendations from "@/components/Recommendations";
import Contact from "@/components/Contact";
import Playground from "@/components/Playground";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="relative overflow-x-clip">
      <Loader />
      <MobileNotice />
      <Aurora />
      <AccentTracker />
      <div className="noise" />
      <Cursor />
      <ScrollSpine />
      <TopBar />

      <div className="relative z-10">
        <Hero />
        <About />
        <Divider index="02" label="WORK" accent="#38bdf8" />
        <Projects />
        <Experiments />
        <GithubActivity />
        <Divider index="04" label="LEADERSHIP" accent="#6366f1" />
        <Leadership />
        <Divider index="05" label="COMMUNITY" accent="#8b5cf6" />
        <Community />
        <Divider index="06" label="RECOMMENDATIONS" accent="#a855f7" />
        <Recommendations />
        <Divider index="07" label="CONTACT" accent="#d946ef" />
        <Contact />
        <Divider index="08" label="PLAYGROUND" accent="#ec4899" />
        <Playground />
        <Footer />
      </div>
    </main>
  );
}
