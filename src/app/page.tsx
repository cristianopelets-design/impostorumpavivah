"use client";

import { useState, useEffect } from "react";
import { Users, Play, LogIn, Crown, Eye, Vote, Trophy, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

// Types
type Player = {
  id: string;
  name: string;
  isLeader: boolean;
  isImpostor: boolean;
  hasVoted: boolean;
  votedFor: string | null;
};

type Room = {
  code: string;
  players: Player[];
  word: string | null;
  gameStarted: boolean;
  votingPhase: boolean;
  gameEnded: boolean;
  winner: "impostor" | "players" | null;
};

export default function ImpostorGame() {
  const [screen, setScreen] = useState<"home" | "create" | "join" | "lobby" | "game">("home");
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [secretWord, setSecretWord] = useState("");
  const [showWord, setShowWord] = useState(false);

  // Load room from localStorage
  useEffect(() => {
    const savedRoomCode = localStorage.getItem("currentRoomCode");
    const savedPlayerId = localStorage.getItem("currentPlayerId");
    
    if (savedRoomCode && savedPlayerId) {
      const room = loadRoom(savedRoomCode);
      if (room) {
        const player = room.players.find(p => p.id === savedPlayerId);
        if (player) {
          setCurrentRoom(room);
          setCurrentPlayer(player);
          if (room.gameStarted) {
            setScreen("game");
          } else {
            setScreen("lobby");
          }
        }
      }
    }
  }, []);

  // Auto-refresh room data
  useEffect(() => {
    if (currentRoom && screen !== "home") {
      const interval = setInterval(() => {
        const room = loadRoom(currentRoom.code);
        if (room) {
          setCurrentRoom(room);
          const player = room.players.find(p => p.id === currentPlayer?.id);
          if (player) {
            setCurrentPlayer(player);
          }
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [currentRoom, currentPlayer, screen]);

  // Helper functions
  const generateRoomCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const generatePlayerId = () => {
    return Math.random().toString(36).substring(2, 15);
  };

  const saveRoom = (room: Room) => {
    localStorage.setItem(`room_${room.code}`, JSON.stringify(room));
  };

  const loadRoom = (code: string): Room | null => {
    const data = localStorage.getItem(`room_${code}`);
    return data ? JSON.parse(data) : null;
  };

  const createRoom = () => {
    if (!playerName.trim()) return;

    const code = generateRoomCode();
    const playerId = generatePlayerId();
    
    const player: Player = {
      id: playerId,
      name: playerName,
      isLeader: true,
      isImpostor: false,
      hasVoted: false,
      votedFor: null,
    };

    const room: Room = {
      code,
      players: [player],
      word: null,
      gameStarted: false,
      votingPhase: false,
      gameEnded: false,
      winner: null,
    };

    saveRoom(room);
    setCurrentRoom(room);
    setCurrentPlayer(player);
    setRoomCode(code);
    localStorage.setItem("currentRoomCode", code);
    localStorage.setItem("currentPlayerId", playerId);
    setScreen("lobby");
  };

  const joinRoom = () => {
    if (!playerName.trim() || !roomCode.trim()) return;

    const room = loadRoom(roomCode.toUpperCase());
    if (!room) {
      alert("Sala não encontrada!");
      return;
    }

    if (room.gameStarted) {
      alert("O jogo já começou!");
      return;
    }

    const playerId = generatePlayerId();
    const player: Player = {
      id: playerId,
      name: playerName,
      isLeader: false,
      isImpostor: false,
      hasVoted: false,
      votedFor: null,
    };

    room.players.push(player);
    saveRoom(room);
    setCurrentRoom(room);
    setCurrentPlayer(player);
    localStorage.setItem("currentRoomCode", room.code);
    localStorage.setItem("currentPlayerId", playerId);
    setScreen("lobby");
  };

  const startGame = () => {
    if (!currentRoom || !secretWord.trim()) return;
    if (currentRoom.players.length < 4) {
      alert("Mínimo de 4 jogadores necessário!");
      return;
    }

    // Select random impostor
    const randomIndex = Math.floor(Math.random() * currentRoom.players.length);
    const updatedPlayers = currentRoom.players.map((p, idx) => ({
      ...p,
      isImpostor: idx === randomIndex,
    }));

    const updatedRoom: Room = {
      ...currentRoom,
      players: updatedPlayers,
      word: secretWord,
      gameStarted: true,
    };

    saveRoom(updatedRoom);
    setCurrentRoom(updatedRoom);
    
    const player = updatedPlayers.find(p => p.id === currentPlayer?.id);
    if (player) {
      setCurrentPlayer(player);
    }
    
    setScreen("game");
  };

  const startVoting = () => {
    if (!currentRoom || !currentPlayer?.isLeader) return;

    const updatedRoom: Room = {
      ...currentRoom,
      votingPhase: true,
    };

    saveRoom(updatedRoom);
    setCurrentRoom(updatedRoom);
  };

  const votePlayer = (targetId: string) => {
    if (!currentRoom || !currentPlayer || currentPlayer.hasVoted) return;

    const updatedPlayers = currentRoom.players.map(p => 
      p.id === currentPlayer.id 
        ? { ...p, hasVoted: true, votedFor: targetId }
        : p
    );

    const updatedRoom: Room = {
      ...currentRoom,
      players: updatedPlayers,
    };

    saveRoom(updatedRoom);
    setCurrentRoom(updatedRoom);
    setCurrentPlayer({ ...currentPlayer, hasVoted: true, votedFor: targetId });

    // Check if all voted
    if (updatedPlayers.every(p => p.hasVoted)) {
      calculateWinner(updatedRoom);
    }
  };

  const calculateWinner = (room: Room) => {
    const votes: { [key: string]: number } = {};
    
    room.players.forEach(player => {
      if (player.votedFor) {
        votes[player.votedFor] = (votes[player.votedFor] || 0) + 1;
      }
    });

    const mostVoted = Object.entries(votes).sort((a, b) => b[1] - a[1])[0];
    const votedPlayer = room.players.find(p => p.id === mostVoted[0]);
    const impostor = room.players.find(p => p.isImpostor);

    const winner = votedPlayer?.id === impostor?.id ? "players" : "impostor";

    const updatedRoom: Room = {
      ...room,
      gameEnded: true,
      winner,
    };

    saveRoom(updatedRoom);
    setCurrentRoom(updatedRoom);
  };

  const leaveRoom = () => {
    localStorage.removeItem("currentRoomCode");
    localStorage.removeItem("currentPlayerId");
    setCurrentRoom(null);
    setCurrentPlayer(null);
    setPlayerName("");
    setRoomCode("");
    setSecretWord("");
    setShowWord(false);
    setScreen("home");
  };

  const resetGame = () => {
    if (!currentRoom || !currentPlayer?.isLeader) return;

    const resetPlayers = currentRoom.players.map(p => ({
      ...p,
      isImpostor: false,
      hasVoted: false,
      votedFor: null,
    }));

    const updatedRoom: Room = {
      ...currentRoom,
      players: resetPlayers,
      word: null,
      gameStarted: false,
      votingPhase: false,
      gameEnded: false,
      winner: null,
    };

    saveRoom(updatedRoom);
    setCurrentRoom(updatedRoom);
    setSecretWord("");
    setShowWord(false);
    setScreen("lobby");
  };

  // Render functions
  const renderHome = () => (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gradient-to-br from-gray-900 to-black border-2 border-orange-500 p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <AlertCircle className="w-16 h-16 text-orange-500" />
          </div>
          <h1 className="text-5xl font-bold text-orange-500 mb-2">IMPOSTOR</h1>
          <p className="text-gray-400">Descubra quem é o impostor!</p>
        </div>

        <div className="space-y-4">
          <Input
            placeholder="Seu nome"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="bg-gray-800 border-orange-500/50 text-white placeholder:text-gray-500 focus:border-orange-500"
          />

          <Button
            onClick={createRoom}
            disabled={!playerName.trim()}
            className="w-full bg-orange-500 hover:bg-orange-600 text-black font-bold py-6 text-lg"
          >
            <Users className="mr-2" />
            Criar Sala
          </Button>

          <Button
            onClick={() => setScreen("join")}
            disabled={!playerName.trim()}
            variant="outline"
            className="w-full border-2 border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-black font-bold py-6 text-lg"
          >
            <LogIn className="mr-2" />
            Entrar em Sala
          </Button>
        </div>
      </Card>
    </div>
  );

  const renderJoin = () => (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gradient-to-br from-gray-900 to-black border-2 border-orange-500 p-8">
        <h2 className="text-3xl font-bold text-orange-500 mb-6 text-center">Entrar na Sala</h2>
        
        <div className="space-y-4">
          <Input
            placeholder="Código da Sala"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            className="bg-gray-800 border-orange-500/50 text-white placeholder:text-gray-500 text-center text-2xl font-bold tracking-widest"
            maxLength={6}
          />

          <Button
            onClick={joinRoom}
            disabled={!roomCode.trim()}
            className="w-full bg-orange-500 hover:bg-orange-600 text-black font-bold py-6"
          >
            Entrar
          </Button>

          <Button
            onClick={() => setScreen("home")}
            variant="ghost"
            className="w-full text-gray-400 hover:text-white"
          >
            Voltar
          </Button>
        </div>
      </Card>
    </div>
  );

  const renderLobby = () => (
    <div className="min-h-screen bg-black p-4">
      <div className="max-w-4xl mx-auto">
        <Card className="bg-gradient-to-br from-gray-900 to-black border-2 border-orange-500 p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-orange-500">Sala: {currentRoom?.code}</h2>
              <p className="text-gray-400">Aguardando jogadores...</p>
            </div>
            <Button
              onClick={leaveRoom}
              variant="outline"
              className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
            >
              Sair
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {currentRoom?.players.map((player) => (
              <div
                key={player.id}
                className="bg-gray-800 border border-orange-500/30 rounded-lg p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-orange-500" />
                  <span className="text-white font-medium">{player.name}</span>
                </div>
                {player.isLeader && (
                  <Crown className="w-5 h-5 text-yellow-500" />
                )}
              </div>
            ))}
          </div>

          {currentPlayer?.isLeader && (
            <div className="space-y-4 border-t border-orange-500/30 pt-6">
              <Input
                placeholder="Digite a palavra secreta"
                value={secretWord}
                onChange={(e) => setSecretWord(e.target.value)}
                className="bg-gray-800 border-orange-500/50 text-white placeholder:text-gray-500"
              />
              <Button
                onClick={startGame}
                disabled={!secretWord.trim() || (currentRoom?.players.length || 0) < 4}
                className="w-full bg-orange-500 hover:bg-orange-600 text-black font-bold py-6 text-lg"
              >
                <Play className="mr-2" />
                Iniciar Jogo
              </Button>
              {(currentRoom?.players.length || 0) < 4 && (
                <p className="text-center text-red-400 text-sm">
                  Mínimo de 4 jogadores necessário
                </p>
              )}
            </div>
          )}

          {!currentPlayer?.isLeader && (
            <div className="text-center text-gray-400 border-t border-orange-500/30 pt-6">
              Aguardando o líder iniciar o jogo...
            </div>
          )}
        </Card>
      </div>
    </div>
  );

  const renderGame = () => {
    if (currentRoom?.gameEnded) {
      const impostor = currentRoom.players.find(p => p.isImpostor);
      
      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl bg-gradient-to-br from-gray-900 to-black border-2 border-orange-500 p-8">
            <div className="text-center mb-8">
              <Trophy className="w-20 h-20 text-orange-500 mx-auto mb-4" />
              <h2 className="text-4xl font-bold text-orange-500 mb-4">
                {currentRoom.winner === "impostor" ? "IMPOSTOR VENCEU!" : "JOGADORES VENCERAM!"}
              </h2>
              <p className="text-2xl text-white mb-2">
                O impostor era: <span className="text-orange-500 font-bold">{impostor?.name}</span>
              </p>
              <p className="text-xl text-gray-400">
                Palavra secreta: <span className="text-white font-bold">{currentRoom.word}</span>
              </p>
            </div>

            <div className="space-y-3 mb-6">
              <h3 className="text-xl font-bold text-orange-500 mb-4">Resultado da Votação:</h3>
              {currentRoom.players.map((player) => {
                const votesReceived = currentRoom.players.filter(p => p.votedFor === player.id).length;
                return (
                  <div
                    key={player.id}
                    className={`bg-gray-800 border rounded-lg p-4 flex justify-between items-center ${
                      player.isImpostor ? "border-red-500" : "border-orange-500/30"
                    }`}
                  >
                    <span className="text-white font-medium">
                      {player.name} {player.isImpostor && "👿"}
                    </span>
                    <span className="text-orange-500 font-bold">{votesReceived} votos</span>
                  </div>
                );
              })}
            </div>

            <div className="space-y-3">
              {currentPlayer?.isLeader && (
                <Button
                  onClick={resetGame}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-black font-bold py-6"
                >
                  Jogar Novamente
                </Button>
              )}
              <Button
                onClick={leaveRoom}
                variant="outline"
                className="w-full border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-black"
              >
                Sair da Sala
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    if (currentRoom?.votingPhase) {
      return (
        <div className="min-h-screen bg-black p-4">
          <div className="max-w-4xl mx-auto">
            <Card className="bg-gradient-to-br from-gray-900 to-black border-2 border-orange-500 p-6">
              <div className="text-center mb-8">
                <Vote className="w-16 h-16 text-orange-500 mx-auto mb-4" />
                <h2 className="text-3xl font-bold text-orange-500 mb-2">Fase de Votação</h2>
                <p className="text-gray-400">Vote em quem você acha que é o impostor</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {currentRoom.players
                  .filter(p => p.id !== currentPlayer?.id)
                  .map((player) => (
                    <Button
                      key={player.id}
                      onClick={() => votePlayer(player.id)}
                      disabled={currentPlayer?.hasVoted}
                      className={`bg-gray-800 hover:bg-orange-500 border-2 border-orange-500/50 text-white hover:text-black font-bold py-8 text-lg ${
                        currentPlayer?.votedFor === player.id ? "bg-orange-500 text-black" : ""
                      }`}
                    >
                      <Users className="mr-2" />
                      {player.name}
                      {player.hasVoted && " ✓"}
                    </Button>
                  ))}
              </div>

              <div className="mt-6 text-center">
                <p className="text-gray-400">
                  {currentRoom.players.filter(p => p.hasVoted).length} / {currentRoom.players.length} jogadores votaram
                </p>
              </div>
            </Card>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-black p-4">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-gradient-to-br from-gray-900 to-black border-2 border-orange-500 p-6 mb-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-orange-500 mb-4">Sua Palavra:</h2>
              
              {!showWord ? (
                <Button
                  onClick={() => setShowWord(true)}
                  className="bg-orange-500 hover:bg-orange-600 text-black font-bold py-8 px-12 text-2xl"
                >
                  <Eye className="mr-2 w-8 h-8" />
                  Revelar Palavra
                </Button>
              ) : (
                <div className="bg-gray-800 border-4 border-orange-500 rounded-xl p-8">
                  <p className="text-5xl font-bold text-orange-500">
                    {currentPlayer?.isImpostor ? "IMPOSTOR" : currentRoom?.word}
                  </p>
                </div>
              )}
            </div>

            <div className="border-t border-orange-500/30 pt-6">
              <h3 className="text-xl font-bold text-orange-500 mb-4">Jogadores na Sala:</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                {currentRoom?.players.map((player) => (
                  <div
                    key={player.id}
                    className="bg-gray-800 border border-orange-500/30 rounded-lg p-3 text-center"
                  >
                    <Users className="w-5 h-5 text-orange-500 mx-auto mb-1" />
                    <span className="text-white text-sm">{player.name}</span>
                    {player.isLeader && <Crown className="w-4 h-4 text-yellow-500 mx-auto mt-1" />}
                  </div>
                ))}
              </div>

              {currentPlayer?.isLeader && !currentRoom?.votingPhase && (
                <Button
                  onClick={startVoting}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-black font-bold py-6 text-lg"
                >
                  <Vote className="mr-2" />
                  Iniciar Votação
                </Button>
              )}

              {!currentPlayer?.isLeader && !currentRoom?.votingPhase && (
                <p className="text-center text-gray-400">
                  Aguardando o líder iniciar a votação...
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  };

  // Main render
  return (
    <>
      {screen === "home" && renderHome()}
      {screen === "join" && renderJoin()}
      {screen === "lobby" && renderLobby()}
      {screen === "game" && renderGame()}
    </>
  );
}
