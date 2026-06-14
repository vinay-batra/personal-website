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
import GithubActivity from "@/components/GithubActivity";
import Leadership from "@/components/Leadership";
import Community from "@/components/Community";
import Recommendations from "@/components/Recommendations";
import Contact from "@/components/Contact";

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
        <Divider index="02" label="WORK" accent="#5cb88a" />
        <Projects />
        <GithubActivity />
        <Divider index="03" label="LEADERSHIP" accent="#5d9ce4" />
        <Leadership />
        <Divider index="04" label="COMMUNITY" accent="#87A5B4" />
        <Community />
        <Divider index="05" label="RECOMMENDATIONS" accent="#8b5cf6" />
        <Recommendations />
        <Divider index="06" label="CONTACT" accent="#E8A33D" />
        <Contact />
      </div>
    </main>
  );
}
