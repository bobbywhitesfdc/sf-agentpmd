/**
 * GameTwo_PlayRound
 *
 * Default-out implementation of one round of half-duplex rock-paper-scissors.
 * Apex owns everything deterministic: random throw, rule application,
 * outcome classification, and score mutation. The agent reasoning layer
 * only interprets the player's natural-language utterance into a
 * normalized choice and composes a conversational response from the
 * structured outputs.
 *
 * ── Instrumentation ───────────────────────────────────────────────
 * Logger.debug() at entry and per-round, Logger.error() in the catch.
 * Lets us forensically verify in Log__c / LogEntry__c whether the
 * action actually fired during a preview session.
 *
 * Wired in the .agent file with:
 *     target: "apex://GameTwo_PlayRound"
 */
public with sharing class GameTwo_PlayRound {

    private static final Set<String> VALID_CHOICES = new Set<String>{
        'rock', 'paper', 'scissors'
    };
    private static final List<String> CHOICE_LIST = new List<String>{
        'rock', 'paper', 'scissors'
    };

    @InvocableMethod(
        label='Play one RPS round'
        description='Picks a random agent throw, adjudicates against the player throw, and returns updated scores.'
    )
    public static List<Result> execute(List<Request> requests) {
        List<Result> results = new List<Result>();
        try {
            Integer count = (requests == null) ? 0 : requests.size();
            Logger.debug('GameTwo_PlayRound ENTRY: requestCount=' + count);
            for (Integer i = 0; i < count; i++) {
                Request req = requests[i];
                Logger.debug(
                    'GameTwo_PlayRound round[' + i + '] in: playerChoice=' + req.playerChoice
                    + ' currentWins=' + req.currentWins
                    + ' currentLosses=' + req.currentLosses
                    + ' currentTies=' + req.currentTies
                );
                Result r = playOne(req);
                Logger.debug(
                    'GameTwo_PlayRound round[' + i + '] out: success=' + r.isSuccess
                    + ' agentChoice=' + r.agentChoice
                    + ' outcome=' + r.outcome
                    + ' newWins=' + r.newWins
                    + ' newLosses=' + r.newLosses
                    + ' newTies=' + r.newTies
                    + (r.errorMessage == null ? '' : ' err=' + r.errorMessage)
                );
                results.add(r);
            }
            Logger.debug('GameTwo_PlayRound EXIT: returning ' + results.size() + ' result(s)');
        } catch (Exception e) {
            Logger.error('GameTwo_PlayRound failed: ' + e.getMessage());
        } finally {
            Logger.saveLog();
        }
        return results;
    }

    private static Result playOne(Request req) {
        Result r = new Result();

        String player = req.playerChoice == null ? '' : req.playerChoice.toLowerCase().trim();
        if (!VALID_CHOICES.contains(player)) {
            r.isSuccess = false;
            r.errorMessage = 'Invalid player choice: ' + req.playerChoice;
            return r;
        }

        Integer wins = parseCount(req.currentWins);
        Integer losses = parseCount(req.currentLosses);
        Integer ties = parseCount(req.currentTies);

        String agent = CHOICE_LIST[Integer.valueOf(Math.floor(Math.random() * 3))];

        String outcome;
        if (player == agent) {
            outcome = 'tie';
            ties += 1;
        } else if (
            (player == 'rock' && agent == 'scissors') ||
            (player == 'scissors' && agent == 'paper') ||
            (player == 'paper' && agent == 'rock')
        ) {
            outcome = 'win';
            wins += 1;
        } else {
            outcome = 'loss';
            losses += 1;
        }

        r.isSuccess = true;
        r.playerChoice = player;
        r.agentChoice = agent;
        r.outcome = outcome;
        r.newWins = String.valueOf(wins);
        r.newLosses = String.valueOf(losses);
        r.newTies = String.valueOf(ties);
        return r;
    }

    private static Integer parseCount(String s) {
        if (String.isBlank(s)) {
            return 0;
        }
        try {
            return Integer.valueOf(s.trim());
        } catch (Exception e) {
            return 0;
        }
    }

    public class Request {
        @InvocableVariable(
            label='Player Choice'
            description='Normalized player throw: rock, paper, or scissors.'
            required=true
        )
        public String playerChoice;

        @InvocableVariable(
            label='Current Wins'
            description='Player win count before this round, as a string integer.'
            required=true
        )
        public String currentWins;

        @InvocableVariable(
            label='Current Losses'
            description='Player loss count before this round, as a string integer.'
            required=true
        )
        public String currentLosses;

        @InvocableVariable(
            label='Current Ties'
            description='Player tie count before this round, as a string integer.'
            required=true
        )
        public String currentTies;
    }

    public class Result {
        @InvocableVariable(
            label='Is Success'
            description='Whether the round was adjudicated successfully.'
        )
        public Boolean isSuccess;

        @InvocableVariable(
            label='Error Message'
            description='Error message if the round failed (e.g., invalid player choice).'
        )
        public String errorMessage;

        @InvocableVariable(
            label='Player Choice (echo)'
            description='The normalized player throw, echoed so the agent can display it without a separate tool call.'
        )
        public String playerChoice;

        @InvocableVariable(
            label='Agent Choice'
            description='The agent throw selected for this round.'
        )
        public String agentChoice;

        @InvocableVariable(
            label='Outcome'
            description='Round outcome from the player perspective: win, loss, or tie.'
        )
        public String outcome;

        @InvocableVariable(
            label='New Wins'
            description='Updated player win count, as a string integer.'
        )
        public String newWins;

        @InvocableVariable(
            label='New Losses'
            description='Updated player loss count, as a string integer.'
        )
        public String newLosses;

        @InvocableVariable(
            label='New Ties'
            description='Updated player tie count, as a string integer.'
        )
        public String newTies;
    }
}
