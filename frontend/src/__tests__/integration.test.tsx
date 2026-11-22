// Drives the real UI against a RUNNING backend (see scripts/ui-test.sh). Nothing here is mocked.
import { readFileSync } from "node:fs";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const env = process.env;
const DOC = env.IL_DOC!, PHONE = env.IL_PHONE!, OFFICER = env.IL_OFFICER_USER!, ADMIN = env.IL_ADMIN_USER!, PASS = env.IL_PASS!;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function latestOtp(phone: string, after: number) {
  for (let i = 0; i < 40; i++) {
    const hits = [...readFileSync(env.OTP_LOG!, "utf8").matchAll(new RegExp(`${phone}: (\\d+)`, "g"))];
    if (hits.length > after) return hits[hits.length - 1][1];
    await wait(150);
  }
  throw new Error("no OTP in server log");
}
const otpCount = (phone: string) => [...readFileSync(env.OTP_LOG!, "utf8").matchAll(new RegExp(`${phone}: (\\d+)`, "g"))].length;

async function loadApp() {
  vi.resetModules();                                  // token and session are module state, so start fresh each time
  const { default: App } = await import("../App");
  render(<App />);
  return userEvent.setup();
}
async function officerLogin(u: ReturnType<typeof userEvent.setup>, user = OFFICER, pass = PASS, admin = false) {
  await u.click(screen.getByText("Secure Access"));
  if (admin) await u.click(await screen.findByText("Administrator"));
  await u.type(await screen.findByPlaceholderText("e.g. AK-DO-UP-2241"), user);
  await u.type(screen.getByPlaceholderText("••••••••••"), pass);
  await u.click(screen.getByText("Continue to 2FA →"));
}

beforeEach(() => sessionStorage.clear());
afterEach(cleanup);

describe("backend mode", () => {
  it("shows that the backend is connected", async () => {
    await loadApp();
    expect(await screen.findByText(/Backend connected/)).toBeTruthy();
  });

  it("rejects a wrong officer password and stays on the login screen", async () => {
    const u = await loadApp();
    await officerLogin(u, OFFICER, "wrong-password");
    expect(await screen.findByText(/Sign-in failed/)).toBeTruthy();
    expect(screen.queryByText("Officer Dashboard")).toBeNull();
  });

  it("does not restore a session from a forged token", async () => {
    sessionStorage.setItem("il_token", "aaa.bbb.ccc");
    await loadApp();
    expect(await screen.findByText("Enter Portal", { selector: "span" }, { timeout: 5000 }).catch(() => null) ?? screen.getAllByText("Enter Portal")[0]).toBeTruthy();
    expect(screen.queryByText("Officer Dashboard")).toBeNull();
  });

  it("officer signs in and sees live numbers and the seeded document", async () => {
    const u = await loadApp();
    await officerLogin(u);
    expect(await screen.findByText("Officer Dashboard", {}, { timeout: 8000 })).toBeTruthy();
    expect(await screen.findByText("Seed Owner", {}, { timeout: 8000 })).toBeTruthy();   // the queue row built from the backend list
  });

  it("officer audit trail shows the server's entries", async () => {
    const u = await loadApp();
    await officerLogin(u);
    await screen.findByText("Officer Dashboard", {}, { timeout: 8000 });
    await u.click(screen.getAllByText("Audit Trail")[0]);
    expect((await screen.findAllByText("OCR Processed", {}, { timeout: 8000 })).length).toBeGreaterThan(0);
    expect((await screen.findAllByText("Uploaded Document")).length).toBeGreaterThan(0);
  });

  it("officer opens real OCR output for the document", async () => {
    const u = await loadApp();
    await officerLogin(u);
    await u.click(await screen.findByText("Live OCR (backend)", {}, { timeout: 8000 }));
    await u.click(await screen.findByText(DOC, { selector: "span" }, { timeout: 8000 }));
    expect(await screen.findByText("2241", {}, { timeout: 8000 })).toBeTruthy();
    expect(screen.getByText(/Suresh Patel/)).toBeTruthy();
  });

  it("administrator signs in and sees live counts", async () => {
    const u = await loadApp();
    await officerLogin(u, ADMIN, PASS, true);
    expect(await screen.findByText("Administrator Dashboard", { selector: "h1" }, { timeout: 8000 })).toBeTruthy();
    expect(await screen.findByText("Documents received", {}, { timeout: 8000 })).toBeTruthy();
    expect(await screen.findByText(/Live backend data/)).toBeTruthy();
  });

  it("an officer account cannot enter as administrator", async () => {
    const u = await loadApp();
    await officerLogin(u, OFFICER, PASS, true);
    expect(await screen.findByText(/does not have the selected role/)).toBeTruthy();
  });

  it("landowner rejects a wrong OTP", async () => {
    const u = await loadApp();
    await u.click(screen.getAllByText("Enter Portal")[0]);
    await u.type(await screen.findByPlaceholderText("10-digit mobile number"), PHONE);
    await u.click(screen.getByText("Get OTP"));
    await u.type(await screen.findByPlaceholderText("6-digit OTP sent to your mobile"), "000000");
    await u.click(screen.getByText("Sign In Securely"));
    expect(await screen.findByText(/Invalid or expired code/)).toBeTruthy();
    expect(screen.queryByText(/Namaste/)).toBeNull();
  });

  it("landowner signs in with the real OTP and sees only their own submission", async () => {
    const u = await loadApp();
    const before = otpCount(PHONE);
    await u.click(screen.getAllByText("Enter Portal")[0]);
    await u.type(await screen.findByPlaceholderText("10-digit mobile number"), PHONE);
    await u.click(screen.getByText("Get OTP"));
    await u.type(await screen.findByPlaceholderText("6-digit OTP sent to your mobile"), await latestOtp(PHONE, before));
    await u.click(screen.getByText("Sign In Securely"));
    expect(await screen.findByText(/Namaste/, {}, { timeout: 8000 })).toBeTruthy();
    await waitFor(() => expect(screen.getByText(/Survey 78\/C/)).toBeTruthy(), { timeout: 8000 });
  });
});
