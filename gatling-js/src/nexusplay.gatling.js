import { simulation, scenario, atOnceUsers, rampUsers, constantUsersPerSec } from "@gatling.io/core";
import { http, status, jsonPath } from "@gatling.io/http";

export default simulation((setUp) => {

  // Configuration HTTP
  const httpProtocol = http
    .baseUrl("http://localhost:3000")
    .acceptHeader("application/json")
    .contentTypeHeader("application/json")
    .userAgentHeader("Gatling/NexusPlay-LoadTest");

  // ============================
  // Scénario 1 : Browse lobbies
  // ============================
  const browseLobbies = scenario("Browse Lobbies")
    .exec(
      http("Health check")
        .get("/health")
        .check(status().in(200, 503))
    )
    .pause(1)
    .exec(
      http("List lobbies")
        .get("/lobbies")
        .check(status().is(200))
        .check(jsonPath("$.count").exists())
    )
    .pause(2)
    .exec(
      http("View stats")
        .get("/stats")
        .check(status().is(200))
    );

  // ============================
  // Scénario 2 : Create lobby
  // ============================
  const createLobby = scenario("Create Lobby")
    .exec(
      http("Create lobby")
        .post("/lobbies")
        .body('{"name":"Test","gameType":"chess","maxPlayers":2}')
        .check(status().is(201))
        .check(jsonPath("$.lobbyId").saveAs("lobbyId"))
    )
    .pause(1);

  // ============================
  // Configuration de charge
  // ============================
  setUp(
    browseLobbies.injectOpen(
      rampUsers(20).during(30),
      constantUsersPerSec(5).during(60)
    ),
    createLobby.injectOpen(
      rampUsers(10).during(30),
      constantUsersPerSec(2).during(60)
    )
  ).protocols(httpProtocol);
});
