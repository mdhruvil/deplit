import { GridPattern } from "@/components/grid-pattern";
import { GithubIcon } from "@/components/icons";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangleIcon,
  GitBranchPlusIcon,
  GlobeIcon,
  Link2Icon,
  LucideIcon,
  RotateCcwIcon,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

function HomeComponent() {
  return (
    <section className="relative h-screen overflow-hidden py-32">
      <div className="absolute inset-x-0 top-0 flex h-full w-full items-center justify-center opacity-100">
        <GridPattern
          squares={[
            [2, 2],
            [5, 1],
            [8, 2],
            [5, 3],
            [13, 5],
            [13, 1],
          ]}
          width={80}
          height={80}
          className={cn(
            "[mask-image:radial-gradient(90%_90%_at_center,white,transparent)]",
            "opacity-50",
          )}
        />
      </div>
      <div className="relative z-10 container mx-auto space-y-32 px-4">
        <div className="w-full space-y-6 text-center">
          <div className="bg-background/30 mx-auto w-fit rounded-xl p-4 shadow-sm backdrop-blur-sm">
            <img src="/logo.svg" alt="logo" className="h-16" />
          </div>
          <div>
            <h1 className="mb-6 text-2xl font-bold tracking-tight text-pretty lg:text-5xl">
              Your complete* platform for the web.
            </h1>
            <p className="text-muted-foreground mx-auto max-w-3xl lg:text-xl">
              Deplit provides the developer tools and cloud infrastructure to
              build, scale, and secure more on the web.
            </p>
          </div>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              to="/login"
              search={{ redirect: "/dashboard" }}
              className={buttonVariants()}
            >
              Get Started
            </Link>
            <a
              href="https://github.com/mdhruvil/deplit"
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ variant: "outline" })}
            >
              <GithubIcon />
              Github
            </a>
          </div>
        </div>
        <div className="mx-auto grid max-w-6xl items-center border md:grid-cols-2 lg:grid-cols-4">
          <FeatureCard
            title="Global CDN"
            icon={GlobeIcon}
            description="Serve your site from nearest to your users"
          />
          <FeatureCard
            title="Preview Deployments"
            icon={GitBranchPlusIcon}
            description="Preview your deployments before production."
          />
          <FeatureCard
            title="Instant Rollbacks"
            icon={RotateCcwIcon}
            description="Instantly rollback to a working deployment."
          />
          <FeatureCard
            title="Subdomain"
            icon={Link2Icon}
            description="Free subdomain for every project."
          />
          {/* Add more FeatureCard components as needed */}
        </div>
      </div>
    </section>
  );
}

type FeatureCardProps = {
  title: string;
  icon: LucideIcon;
  description: string;
};

export function FeatureCard(props: FeatureCardProps) {
  return (
    <div className="bg-background flex h-full flex-col gap-3 border p-5 md:gap-5">
      {<props.icon className="size-6" />}
      <div>
        <h2 className="text-sm font-semibold md:text-base">{props.title}</h2>
        <p className="text-muted-foreground text-sm">{props.description}</p>
      </div>
    </div>
  );
}
