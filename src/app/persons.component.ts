import { Component, OnInit } from '@angular/core';
import { Apollo } from 'apollo-angular';
import gql from 'graphql-tag';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface IPersonagem {
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

  personagens$: Observable<IPersonagem[]>;

  constructor(private _apollo: Apollo) { }

  ngOnInit() {
    this.personagens$ = this._apollo.query<{ personagens: IPersonagem[] }>({
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
    }).pipe(map(resp => resp.data.personagens));
  }

  track(index, item) {
    return item.id;
  }
}
