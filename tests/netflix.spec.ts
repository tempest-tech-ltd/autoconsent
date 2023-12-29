import generateCMPTests from "../playwright/runner";

generateCMPTests('netflix-com', [
  'https://netflix.com'], {
  skipRegions: ["US", "FR", "GB"]
}
);
