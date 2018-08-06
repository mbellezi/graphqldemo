const express = require('express');
const fs = require('fs');
const app = express();
const { ApolloServer, gql } = require('apollo-server-express');
const axios = require('axios');

const data_people = JSON.parse(fs.readFileSync('./sw-data/people.json').toString());

const pessoas = data_people.map(pessoa => {
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

const obtemPessoa = (id) => pessoas.filter(pessoa => pessoa.id === id)[ 0 ];
const obtemPessoas = (ids) => pessoas.filter(pessoa => ids.findIndex(elm => elm === pessoa.id) > -1);
const obtemSorte = () => axios.get('http://fortunecookieapi.herokuapp.com/v1/fortunes?limit=30').then(resp => resp.data[Math.ceil(Math.random()*30)].message);
const converteAltura = (altura, tipo) => tipo === 'm' ? parseFloat(altura) / 100 : altura;

const mudaNome = (id, novonome) => {
  const pessoa = obtemPessoa(id);
  pessoa.nome = novonome;
  return pessoa;
};

const atualizaPersonagem = (id, caracteristicas) => {
  const pessoa = obtemPessoa(id);
  const novaPessoa = { ...pessoa, ...caracteristicas };
  const idx = pessoas.findIndex(pessoa => pessoa.id === id);
  pessoas[ idx ] = novaPessoa;
  return novaPessoa;
};

const apagaPersonagem = (id) => {
  const idx = pessoas.findIndex(pessoa => pessoa.id === id);
  return idx > -1 && pessoas.splice(idx, 1).length > 0;
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
    amigos: (obj, args, context) => obtemPessoas(obj.amigos || []),
    sorte: (obj, args, context) => obtemSorte(),
    altura: (obj, args, context) => converteAltura(obj.altura, args.tipo)
  },
  Droid: {
    amigos: (obj, args, context) => obtemPessoas(obj.amigos || []),
    sorte: (obj, args, context) => obtemSorte(),
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
    personagens: () => pessoas,
    personagem: (obj, args, context) => obtemPessoa(args.id),
    heroi: (obj, args, context) => obtemPessoa(args.id)
  },
  Mutation: {
    muda_nome: (obj, args, context) => mudaNome(args.id, args.novonome),
    atualiza_personagem: (obj, args, context) => atualizaPersonagem(args.id, args.caracteristicas),
    apaga_personagem: (obj, args, context) => apagaPersonagem(args.id)
  }
};

const server = new ApolloServer({
  typeDefs, resolvers, playground: {
    settings: {
      'editor.theme': 'light', "editor.fontSize": 24, 'editor.cursorShape': 'block',
    }
  },
  formatError: error => {
    console.error(error);
    return new Error('Internal server error');
  },
});


server.applyMiddleware({ app });
app.use(express.static('dist/graphqldemo'));


app.listen(4200, function() {
  console.log('App GraphQL escutando na porta 4200!');
});
