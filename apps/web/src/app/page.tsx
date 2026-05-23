import { HomePageClient } from "./home-page-client";

type SearchParamsRecord = Record<string, string | string[] | undefined>;

export default async function HomePage(props: { searchParams?: Promise<SearchParamsRecord> }) {
  const searchParams = props.searchParams ? await props.searchParams : undefined;
  const requestedMode = readFirstSearchParam(searchParams?.mode);
  const nextPath = resolveNextPath(readFirstSearchParam(searchParams?.next));

  return (
    <HomePageClient
      initialMode={requestedMode === "login" ? "login" : "register"}
      nextPath={nextPath}
    />
  );
}

function readFirstSearchParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function resolveNextPath(value: string | undefined) {
  if (!value || !value.startsWith("/")) {
    return "/personal-center";
  }
  return value;
}
