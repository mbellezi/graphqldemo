import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { IPersonagem } from './persons.component';
import { FormControl, FormGroup } from '@angular/forms';

@Component({
  selector: 'person-edit',
  templateUrl: 'person-edit.component.html',
  styleUrls: [ 'person-edit.component.css' ]
})

export class PersonEditComponent implements OnInit {

  form: FormGroup;

  constructor(@Inject(MAT_DIALOG_DATA) public data: IPersonagem, private _dialogRef: MatDialogRef<PersonEditComponent>) { }

  ngOnInit() {
    this.form = new FormGroup({
      nome: new FormControl(this.data.nome),
      altura: new FormControl(this.data.altura),
      peso: new FormControl(this.data.peso),
    });
  }

  salvar_alteracoes() {
    const altura = parseFloat(this.form.value.altura)*100;
    this._dialogRef.close({ id: this.data.id, caracteristicas: { ...this.form.value, altura } });
  }
}
