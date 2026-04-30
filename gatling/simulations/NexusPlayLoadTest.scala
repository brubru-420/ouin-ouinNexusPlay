package nexusplay

import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration._

class NexusPlayLoadTest extends Simulation {

  // Configuration
  val targetUrl = sys.env.getOrElse("TARGET_URL", "http://localhost:3000")
  
  val httpProtocol = http
    .baseUrl(targetUrl)
    .acceptHeader("application/json")
    .contentTypeHeader("application/json")
    .userAgentHeader("Gatling/NexusPlay-LoadTest")

  // ====================================
  // Scénarios
  // ====================================

  // Scénario 1 : Joueur qui consulte les lobbies
  val browseLobbies = scenario("Browse Lobbies")
    .exec(http("Health check")
      .get("/health")
      .check(status.in(200, 503)))
    .pause(1)
    .exec(http("List lobbies")
      .get("/lobbies")
      .check(status.is(200))
      .check(jsonPath("$.count").exists))
    .pause(2)
    .exec(http("View stats")
      .get("/stats")
      .check(status.is(200)))

  // Scénario 2 : Joueur qui crée un lobby
  val createLobby = scenario("Create Lobby")
    .exec(http("Create lobby")
      .post("/lobbies")
      .body(StringBody("""{"name":"Test Lobby","gameType":"chess","maxPlayers":2}"""))
      .check(status.is(201))
      .check(jsonPath("$.lobbyId").saveAs("lobbyId")))
    .pause(1)
    .exec(http("Join lobby")
      .post("/lobbies/${lobbyId}/join")
      .body(StringBody("""{"playerId":"player_${__UUID()}"}"""))
      .check(status.is(200)))

  // ====================================
  // Configuration de charge
  // ====================================
  setUp(
    // Montée progressive
    browseLobbies.inject(
      rampUsersPerSec(1).to(10).during(30.seconds),
      constantUsersPerSec(10).during(60.seconds)
    ),
    createLobby.inject(
      rampUsersPerSec(1).to(5).during(30.seconds),
      constantUsersPerSec(5).during(60.seconds)
    )
  ).protocols(httpProtocol)
    .assertions(
      global.responseTime.percentile3.lt(1000),  // p95 < 1s
      global.successfulRequests.percent.gt(95)   // > 95% succès
    )
}
