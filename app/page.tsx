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
        <Divider index="02" label="WORK" accent="#dfe7ee" />
        <Projects />
        <GithubActivity />
        <Divider index="04" label="LEADERSHIP" accent="#dfe7ee" />
        <Leadership />
        <Divider index="05" label="COMMUNITY" accent="#dfe7ee" />
        <Community />
        <Divider index="06" label="RECOMMENDATIONS" accent="#dfe7ee" />
        <Recommendations />
        <Divider index="07" label="CONTACT" accent="#dfe7ee" />
        <Contact />
        <Footer />
      </div>
    </main>
  );
}
