const express = require('express');
const fs = require('fs');
const app = express();
const { ApolloServer, gql } = require('apollo-server-express');
const axios = require('axios');
const DataLoader = require('dataloader');

const data_people = JSON.parse(fs.readFileSync('./sw-data/people.json').toString());

const personagens = data_people.map(pessoa => {
  return {
    ...pessoa.fields,
    altura: pessoa.fields.altura && pessoa.fields.altura !== 'unknown' ? parseFloat(pessoa.fields.altura) : null,
    peso: pessoa.fields.peso && pessoa.fields.peso !== 'unknown' ? parseFloat(pessoa.fields.peso) : null,
    id: '' + pessoa.pk
  };
});

// console.log(people);

const typeDefs = gql`
  type Query {
    personagens: [Personagem]
    personagem(id: ID!): Personagem
    heroi(id: ID!): Heroi
  }

  type Mutation {
    muda_nome(id: ID!, novonome: String): Personagem
    atualiza_personagem(id: ID!, caracteristicas: IPersonagem): Personagem
    apaga_personagem(id: ID!): Boolean
  }

  interface Personagem {
    id: ID!
    nome: String!
    altura(tipo: String = "cm"): Float
    peso: Float
    planeta_natal: ID
    imagem: String,
    amigos: [Personagem],
    sorte: String
  }

  type Humano implements Personagem {
    id: ID!
    nome: String!
    altura(tipo: String = "cm"): Float
    peso: Float
    planeta_natal: ID
    imagem: String
    amigos: [Personagem]
    sorte: String
    sexo: String
    ano_nascimento: String
  }

  type Droid implements Personagem {
    id: ID!
    nome: String!
    altura(tipo: String = "cm"): Float
    peso: Float
    planeta_natal: ID
    imagem: String
    amigos: [Personagem]
    sorte: String
    designacao: String
    tipo: String
  }

  union Heroi = Humano | Droid

  input IPersonagem {
    nome: String!
    altura: Float
    peso: Float
    planeta_natal: ID
    imagem: String,
    amigos: [ID]
  }
`;

const obtemPersonagem = (id) => personagens.filter(pessoa => pessoa.id === id)[ 0 ];
const converteAltura = (altura, tipo) => tipo === 'm' ? parseFloat(altura) / 100 : altura;

const mudaNome = (id, novonome) => {
  const personagem = obtemPersonagem(id);
  personagem.nome = novonome;
  return personagem;
};

const atualizaPersonagem = (id, caracteristicas) => {
  const perso = obtemPersonagem(id);
  const novoPerso = { ...perso, ...caracteristicas };
  const idx = personagens.findIndex(pessoa => pessoa.id === id);
  personagens[ idx ] = novoPerso;
  return novoPerso;
};

const apagaPersonagem = (id) => {
  const idx = personagens.findIndex(pessoa => pessoa.id === id);
  return idx > -1 && personagens.splice(idx, 1).length > 0;
};

const obtemPersonagens = (ids) => {
  return personagens.filter(pessoa => {
    const idx = ids.findIndex(elm => elm === pessoa.id);
    if (idx > -1) {
      console.log(`Busquei: ${pessoa.id}`);
      return true;
    }
    return false;
  })
};

const obtemSorte = (id) => axios.get('http://fortunecookieapi.herokuapp.com/v1/fortunes?limit=35').then(resp => {
  console.log('REST Acionado');
  console.log(`Busquei: ${id}`);
  return resp.data[ id ].message;
});


const obtemPersonagensDL = (ids) => {
  const ret = [];
  ids.forEach(id => {
    const idx = personagens.findIndex(perso => perso.id === id);
    if (idx > -1) {
      console.log(`Busquei: ${id}`);
      ret.push(personagens[ idx ]);
    } else
      ret.push(null);
  });
  return Promise.resolve(ret);
};

const obtemSortesDL = async (ids) => {
  const sortes = (await axios.get('http://fortunecookieapi.herokuapp.com/v1/fortunes?limit=35')).data;
  console.log('REST Acionado');
  const ret = [];
  ids.forEach(id => {
    console.log(`Busquei: ${id}`);
    ret.push(sortes[ id ].message);
  });
  return ret;
};

const idAleatorio = (max) => {
  return Math.floor(Math.random() * 30);
};

const resolvers = {
  Personagem: {
    __resolveType(obj, context, info) {
      if (obj.designacao) {
        return 'Droid';
      }

      return 'Humano'
    }
  },

  Humano: {
    // amigos: (obj, args, context) => obtemPersonagens(obj.amigos || []),
    // sorte: (obj, args, context) => obtemSorte(idAleatorio(30)),
    amigos: (obj, args, context) => context.personagens.loadMany(obj.amigos || []),
    sorte: (obj, args, context) => context.sorte.load(idAleatorio(30)),
    altura: (obj, args, context) => converteAltura(obj.altura, args.tipo)
  },
  Droid: {
    // amigos: (obj, args, context) => obtemPersonagens(obj.amigos || []),
    // sorte: (obj, args, context) => obtemSorte(idAleatorio(30)),
    amigos: (obj, args, context) => context.personagens.loadMany(obj.amigos || []),
    sorte: (obj, args, context) => context.sorte.load(idAleatorio(30)),
    altura: (obj, args, context) => converteAltura(obj.altura, args.tipo)
  },

  Heroi: {
    __resolveType(obj, context, info) {
      if (obj.designacao) {
        return 'Droid';
      }

      return 'Humano'
    },
  },
  Query: {
    personagens: () => personagens,
    personagem: (obj, args, context) => obtemPersonagem(args.id),
    heroi: (obj, args, context) => obtemPersonagem(args.id)
  },
  Mutation: {
    muda_nome: (obj, args, context) => mudaNome(args.id, args.novonome),
    atualiza_personagem: (obj, args, context) => atualizaPersonagem(args.id, args.caracteristicas),
    apaga_personagem: (obj, args, context) => apagaPersonagem(args.id)
  }
};

const server = new ApolloServer(
  {
    typeDefs,
    resolvers,
    playground: { settings: { 'editor.theme': 'light', "editor.fontSize": 24, 'editor.cursorShape': 'block', } },
    formatError: error => {
      console.error(error);
      return new Error('Internal server error');
    },
    context: () => ({
      personagens: new DataLoader(ids => obtemPersonagensDL(ids)),
      sorte: new DataLoader(ids => obtemSortesDL(ids))
    })
  }
);


server.applyMiddleware({ app });
app.use(express.static('dist/graphqldemo'));


app.listen(4200, function() {
  console.log('App GraphQL escutando na porta 4200!');
});
