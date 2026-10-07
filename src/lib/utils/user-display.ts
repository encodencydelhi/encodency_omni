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

  let fullName = rawName;
  let firstName = "";

  if (!fullName) {
    // No name saved on the account: keep the account label factual, but do not greet with the email local-part.
    fullName = email || "User";
    firstName = "User";
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
