# Babylon

Two people climb a hollow tower on two spiral stairs. Neither has to wait for the other. At five heights a broken bridge reaches across the void, and it joins only while both climbers stand at its ends. A joined bridge stays, so every bridge in the tower can be traced to two people being in one place at one moment.

Made by Yiran Shu at the NYC Non-Slop Hackathon on 22 November 2026. The hackathon theme was "What matters when you can generate anything? Can you explain your choices?"

## Today, and what comes next

**Today** the two climbers are two people, each on their own device.

**Next** the second climber can be an AI. When nobody else has joined your tower, an AI climber hosted on Modal's cloud joins the same room. It walks its own stair, rests on the landings, and comes to stand at the far end of a broken bridge when you stand at yours, so the bridges can still be joined when you are alone.

Modal is where it would run because the AI needs to live somewhere other than a player's browser, and it only needs to run while a tower is waiting for a second climber.

This is planned. It is not built yet.

## Play

Open the page, press **Invite**, and send the link to a second player. It also works alone: press **Tab** to play both climbers.

- **W / S** or the arrow keys: walk up and down. On a phone, use the ▲ ▼ buttons.
- **Space**: cut between the close frame and the wide frame.
- The yellow line is your breath. It runs down as you walk and refills on a landing. If it runs out, you slide back to the landing below.
- At the top you pass through the vault and come out at the ground, carrying its white dust.

The rules, and the reason for each one, are in [docs/rules.md](docs/rules.md) (in Chinese).

## Versions

All three are kept, as tags and as playable pages.

| Version | What it is | Page |
|---|---|---|
| v2 | Babylon, with the close frame seen through the climber's own eyes | `/` |
| v1 | Babylon, with the close frame following the figure from behind | `/v1/` |
| v0 | The first piece of the day: a tower where each floor is made from a phrase of movement, and every part can say which movement made it | `/v0/` |

## Run it yourself

There is no build step. Serve the folder with any static server, for example:

```
python3 -m http.server 5173
```

Then open `http://localhost:5173/`.

## How it was made

- The design direction, visual references and decisions are Yiran's.
- The code was written with Claude (Anthropic) during the hackathon.
- Rendering uses [three.js](https://threejs.org) (MIT). The two players are kept in step through public MQTT relay servers, using [MQTT.js](https://github.com/mqttjs/MQTT.js) (MIT). Both libraries are included under `vendor/`.

Colours and on-screen wording in `src/climb.js` (`PAL` and `TEXT`) are placeholders.
