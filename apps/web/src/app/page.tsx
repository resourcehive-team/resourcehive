import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const resources = [
  { name: "Camera", owner: "Media Club", available: true },
  { name: "Projector", owner: "CSE Department", available: true },
  { name: "Microphone", owner: "Drama Society", available: false },
];

export default function Home() {
  return (
    <>
      <header className="border-b">
        <nav className="container mx-auto flex items-center justify-between p-4">
          <a href="#">ResourceHive</a>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              nativeButton={false}
              render={<a href="#resources" />}
            >
              Resources
            </Button>
            <Button nativeButton={false} render={<Link href="/login" />}>
              Login
            </Button>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href="/signup" />}
            >
              Sign up
            </Button>
          </div>
        </nav>
      </header>

      <main>
        <section className="container mx-auto grid gap-4 py-8">
          <h1>Share resources at the university</h1>
          <p>
            Students and university groups can list items here and let other
            students borrow them.
          </p>
          <div className="flex gap-2">
            <Button nativeButton={false} render={<a href="#resources" />}>
              See resources
            </Button>
            <Button variant="outline">Add resource</Button>
          </div>
        </section>

        <section className="container mx-auto grid gap-4 py-8" id="resources">
          <h2>Resources</h2>

          <div className="grid gap-4 md:grid-cols-3">
            {resources.map((resource) => (
              <Card key={resource.name}>
                <CardContent>Image here</CardContent>
                <CardHeader>
                  <CardTitle>{resource.name}</CardTitle>
                  <CardDescription>Owner: {resource.owner}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge variant={resource.available ? "default" : "secondary"}>
                    {resource.available ? "Available" : "Not available"}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="container mx-auto grid gap-4 py-8">
          <h2>How to use it</h2>
          <ol className="list-decimal pl-4">
            <li>Find an item.</li>
            <li>Send a request.</li>
            <li>Return it when you are done.</li>
          </ol>
        </section>
      </main>

      <footer className="border-t">
        <div className="container mx-auto p-4">
          <small>ResourceHive - University of Moratuwa</small>
        </div>
      </footer>
    </>
  );
}
