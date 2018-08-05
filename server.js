const express = require('express');
const fs = require('fs');
const app = express();
const { ApolloServer, gql } = require('apollo-server-express');
const axios = require('axios');

const data_people = JSON.parse(fs.readFileSync('./sw-data/people.json').toString());

const pessoas = data_people.map(person => {
  return { ...person.fields, id: '' + person.pk };
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
    amigos: (root, args, context) => obtemPessoas(root.amigos || []),
    sorte: (root, args, context) => obtemSorte(),
    altura: (root, args, context) => args.tipo === 'm' ? parseFloat(root.altura) / 100 : root.altura
  },
  Droid: {
    amigos: (root, args, context) => obtemPessoas(root.amigos || []),
    sorte: (root, args, context) => obtemSorte(),
    altura: (root, args, context) => args.tipo === 'm' ? parseFloat(root.altura) / 100 : root.altura
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
    personagem: (root, args, context) => obtemPessoa(args.id),
    heroi: (root, args, context) => obtemPessoa(args.id)
  },
  Mutation: {
    muda_nome: (root, args, context) => {
      const pessoa = obtemPessoa(args.id);
      pessoa.nome = args.novonome;
      return pessoa;
    },
    atualiza_personagem: (root, args, context) => {
      const pessoa = obtemPessoa(args.id);
      const novaPessoa = { ...pessoa, ...args.caracteristicas };
      const idx = pessoas.findIndex(pessoa => pessoa.id === args.id);
      pessoas[ idx ] = novaPessoa;
      return novaPessoa;
    }
  }
};

const server = new ApolloServer({
  typeDefs, resolvers, playground: {
    settings: {
      'editor.theme': 'light', "editor.fontSize": 24, 'editor.cursorShape': 'block',
    }
  }
});


server.applyMiddleware({ app });
app.use(express.static('dist/graphqldemo'));


app.listen(4200, function() {
  console.log('App GraphQL escutando na porta 4200!');
});
