"use client";

export default function LoginForm() {
  const username = "Sristi";
  const password = "123324234";

  function addUser(username: string, password: string) {
    console.log(username);
    console.log(password);
  }

  addUser(username, password);

  return (
    <>
      <h1>{username}</h1>
      <h1>{password}</h1>
      <button onClick={() => addUser(username, password)}>Add User</button>
    </>
  );
}