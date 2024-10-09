import { generateId, getRecordByFilter, insertRecord, updateRecord } from '@/actions/database/databaseActions';

export async function getWaitingMatch({ select }){
    return await getRecordByFilter('matches', select, 'status', 'waiting');
}

export async function startMatch({user, match, router}){
    if(!match){
        await insertRecord('matches', {
            ...match,
            id: await generateId('matches'),
            players: [user.id]
        });
    }else{
        if(!match.players.includes(user.id)){
            await updateMatch({
                ...match,
                players: [...match.players, user.id]
            });
        }
    }router.push('/partida');
}

export async function updateMatch(match){
    return await updateRecord('matches', match, 'id', match.id);
}