import EventsDashboard from "@/components/EventsDashboard";

export default function Home() {
  return (
    <div className="min-h-screen p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Events Dashboard</h1>
      </header>
      <main>
        <EventsDashboard />
      </main>
    </div>
  );
}
