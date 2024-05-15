import {EventEmitter, Injectable} from '@angular/core';
import {Base} from "../../models/game/base";
import {Color, Group, Vector3} from "three";
import {ModelService} from "../modelService/model.service";
import {CacheBase} from "../../models/cache/cache-base";
import {PlayerService} from "../playerService/player.service";

@Injectable({
  providedIn: 'root'
})
export class BaseService {

  // all the bases and their models
  private bases: CacheBase[] = [];

  // an event emitter to trigger scene add and delete actions
  public update: EventEmitter<{add: boolean, model: Group}> = new EventEmitter();

  // constructor with the required services:
      // modelService to get the models
      // playerService to get team color
  constructor(private modelService: ModelService, private playerService: PlayerService) {};

  // update all bases
  public updateBases(bases: Base[]): void {
    bases.forEach(base => this.updateBase(base));
  }

  // update a base
  private updateBase(base: Base): void {
    // get the index of the base in cache
    let baseIndex: number = this.getBaseListIndex(base.uid);
    // check if the base exists
    if (baseIndex === -1) {
      // add a new base with its model
      baseIndex = this.bases.push({base: base, model: this.modelService.getModel(base.level)}) - 1;
      // emmit event so the sceneService can add the model to the scene
      this.update.emit({add: true, model: this.bases[baseIndex].model});
      // set the base position instant
      this.bases[baseIndex].model.position.set(base.position.x, base.position.y, base.position.z);

      // update the base with baseIndex with a new owner
      this.updateColor(baseIndex, base.player);
      // return since base is up-to-date
      return;
    }

    // check if the base got upgraded
    if (this.bases[baseIndex].base.level !== base.level) {
      // remove the old model from the scene
      this.update.emit({add: false, model: this.bases[baseIndex].model});
      // update the model
      this.bases[baseIndex].model = this.modelService.getModel(base.level);
      // add the new model to the scene
      this.update.emit({add: true, model: this.bases[baseIndex].model});
    }

    // check if the base got conquered
    if (this.bases[baseIndex].base.player !== base.player) {
      // update the owner color
      this.updateColor(baseIndex, base.player);
    }

    // update the rest of the base
    this.bases[baseIndex].base = base;
  }

  // update the base team color
  private updateColor(baseIndex: number, playerId: number): void {
    // loop over all model layers
    this.bases[baseIndex].model.traverse((model) => {
      // check for the teamColor layer
      if (model.name.includes("teamColor")) {
        // idk why this works, so don't touch it
        (<any>model).material = (<any>model).material.clone();
        // set color from HEX
        (<any>model).material.color = new Color(this.playerService.getPlayer(playerId).color);
        // add highlight glow
        (<any>model).material.emissive = (<any>model).material.color;
      }
    })
  }

  // get the index of a base in the cache
  private getBaseListIndex(uid: number): number {
    // map the bases to their id and get the index of the id
    return this.bases.map(base => base.base.uid).indexOf(uid);
  }

  // clear all bases
  public clear(): void {
    // for each base
    this.bases.forEach(base => {
      // unload the base from the scene
      this.update.emit({add: false, model: base.model});
    })
    // reset the cache
    this.bases = [];
  }

  // get base position by uid
  public getPosition(uid: number): Vector3 {
    // return the position of the base
    return <Vector3> this.bases[this.getBaseListIndex(uid)].base.position;
  }

  // get bases by owner
  public getOwnedBases(playerId: number): Base[] {
    return this.bases.map(base => base.base).filter(base => base.player === playerId);
  }
}