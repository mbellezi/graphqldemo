import { Component, OnInit } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { Observable } from 'rxjs';
import { ApolloQueryResult } from 'apollo-client';
import { QueryRef } from 'apollo-angular/QueryRef';
import gql from 'graphql-tag';
import { MatDialog } from '@angular/material';
import { PersonEditComponent } from './person-edit.component';

export interface IPersonagem {
  id: string
  nome: string
  altura: number
  peso: number
  planeta_natal: string
  imagem: string
  amigos: string[]
  sorte: string
  sexo: string
  ano_nascimento: string
  designacao: string
  tipo: string
}

@Component({
  selector: 'persons',
  templateUrl: 'persons.component.html',
  styleUrls: [ 'persons.component.css' ]
})

export class PersonsComponent implements OnInit {

  personagens$: Observable<ApolloQueryResult<IPersonagem[]>>;
  queryRef: QueryRef<IPersonagem[]>;

  constructor(private _apollo: Apollo, private _dialog: MatDialog) { }

  ngOnInit() {
    this.queryRef = this._apollo.watchQuery<IPersonagem[]>({
      query: gql`
        {
          personagens {
            id
            nome
            altura(tipo: "m")
            peso
            planeta_natal
            imagem
#            sorte
          }
        }
      `,
    });
    this.personagens$ = this.queryRef.valueChanges;
  }


  apaga_personagem(id: string) {
    this._apollo.mutate<boolean>({
      mutation: gql`
        mutation {
          apaga_personagem(id: "${id}")
        }
      `,
      variables: { id }
    }).toPromise().then(() => this.queryRef.refetch());
  }


  editar_personagem(info: IPersonagem) {
    this._dialog.open(PersonEditComponent, { data: info }).beforeClose().toPromise()
    .then((info: { id: string, caracteristicas: IPersonagem }) => {
      this._apollo.mutate<boolean>({
        mutation: gql`
          mutation atualiza_personagem($id: ID!, $caracteristicas: IPersonagem){
            atualiza_personagem(id: $id, caracteristicas: $caracteristicas) {
              id
            }
          }
        `,
        variables: { id: info.id, caracteristicas: info.caracteristicas }
      }).toPromise().then(() => this.queryRef.refetch());
      console.log(info);
    });
  }


  static track(index, item) {
    return item.id;
  }
}
