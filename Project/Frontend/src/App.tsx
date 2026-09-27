import keycloak from "./keycloak";

function App() {
  const token = keycloak.tokenParsed;

  return (
      <div>
        <h1>Outdoor Trip Companion</h1>

        <p>
          <strong>Subject:</strong> {token?.sub}
        </p>

        <p>
          <strong>Username:</strong> {token?.preferred_username}
        </p>

        <p>
          <strong>Email:</strong> {token?.email}
        </p>
      </div>
  );
}

export default App;