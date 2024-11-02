import { generateId, getRecordByFilter, insertRecord, updateRecord } from '@/actions/database/databaseActions';

export async function getWaitingMatch({ select }){
    return await getRecordByFilter('matches', select, 'status', 'waiting');
}

export async function createMatch({user, match, router}){
    if(!match){
        const id = await generateId('matches');
        await insertRecord('matches', {
            ...match,
            id: id,
            host: user.id,
            players: [user.id]
        });
        router.push(`/lobby/${id}`);
    }else{
        if(!match.players.includes(user.id)){
            await updateMatch({
                ...match,
                players: [...match.players, user.id]
            });
        };
        router.push(`/lobby/${match.id}`);
    }
}

export async function startMatch({match, players, router}){
    await updateMatch({
        ...match,
        status: 'progress'
    });
    let position = 0;
    for(const player of players){
        await insertRecord('game-players', {
            id: await generateId('game-players'),
            idUser: player.id,
            name: player.name,
            position: position
        });
        position++;
    } router.push(`/game/${match.id}`);
}

export async function updateMatch(match){
    return await updateRecord('matches', match, 'id', match.id);
}