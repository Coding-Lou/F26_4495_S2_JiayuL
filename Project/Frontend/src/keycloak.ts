import Keycloak from "keycloak-js";

const keycloak = new Keycloak({
    url: "http://localhost:8180",
    realm: "outdoor-trip",
    clientId: "outdoor-web",
});

export default keycloak;