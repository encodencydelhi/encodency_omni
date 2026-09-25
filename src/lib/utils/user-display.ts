export interface UserDisplayInfo {
  fullName: string;
  firstName: string;
  email: string;
  initials: string;
}

export function getUserDisplay(user?: { email?: string; name?: string } | null): UserDisplayInfo {
  if (!user?.email && !user?.name) {
    return {
      fullName: "User",
      firstName: "User",
      email: "user@example.com",
      initials: "US",
    };
  }

  const email = (user.email || "").trim();
  const rawName = user.name && user.name !== email ? user.name.trim() : "";
  const localPart = email.split("@")[0] || "User";

  let fullName = rawName;
  let firstName = "";

  if (!fullName) {
    const lower = localPart.toLowerCase();
    if (lower.includes("sompal") || lower.includes("somfrontend")) {
      fullName = "Sompal";
      firstName = "Sompal";
    } else if (lower.includes("manish")) {
      fullName = "Manish Sirohi";
      firstName = "Manish";
    } else {
      const clean = localPart
        .replace(/[0-9]/g, "")
        .replace(/[._-]/g, " ")
        .trim();
      if (clean) {
        fullName = clean
          .split(/\s+/)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
        firstName = fullName.split(" ")[0] || fullName;
      } else {
        fullName = localPart.charAt(0).toUpperCase() + localPart.slice(1);
        firstName = fullName;
      }
    }
  } else {
    firstName = fullName.split(" ")[0] || fullName;
  }

  const words = fullName.split(" ").filter(Boolean);
  const firstChar = words[0]?.charAt(0) || "";
  const secondChar = words[1]?.charAt(0) || "";
  const initials =
    words.length > 1
      ? (firstChar + secondChar).toUpperCase()
      : (fullName.slice(0, 2)).toUpperCase();

  return {
    fullName,
    firstName: firstName || fullName,
    email: email || "user@example.com",
    initials: initials || "US",
  };
}
